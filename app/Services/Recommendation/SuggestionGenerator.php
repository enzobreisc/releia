<?php

namespace App\Services\Recommendation;

use App\Models\Setting;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryAvailability;
use App\Support\BookIdentity;

final class SuggestionGenerator
{
    /** How many searches have been made: each one starts reading Open Library on the next page. */
    private const ROUND_KEY = 'suggestion-round';

    private const PAGES = 3;

    public function __construct(
        private readonly SourceBooks $sources,
        private readonly BlockedKeys $blockedKeys,
        private readonly SuggestionCollector $collector,
        private readonly PortugueseEditions $editions,
        private readonly PendingRecommendations $pending,
        private readonly SimilarTitles $similarTitles,
        private readonly OpenLibraryAvailability $availability,
        private readonly ScoredRanker $ranker = new ScoredRanker,
    ) {}

    /**
     * Finds new suggestions and returns how many were created, adding to the pending ones.
     * Each search re-draws the source books and reads Open Library pages until it has enough new suggestions,
     * so it does not always return the same ones.
     */
    public function generate(): int
    {
        $round = (int) Setting::get(self::ROUND_KEY, 0);
        $created = $this->search($round, SearchScope::general())->created();

        if ($created === []) {
            if (! $this->availability->isUnavailable()) {
                Setting::put(self::ROUND_KEY, $round + 1);
            }

            return 0;
        }

        $this->pending->store($created);
        Setting::put(self::ROUND_KEY, $round + 1);
        $this->pending->expireOverflow();

        return count($created);
    }

    /**
     * The suggestions a request answers with: the pending ones by its authors, then the new ones it finds.
     * A request always reads from the first page, so the same request finds the same works again.
     *
     * @return list<int>
     */
    public function searchFor(SearchScope $scope): array
    {
        $pendingIds = $this->pending->matchingIds($scope);
        $created = $this->search(0, $scope->withCapacity(SearchScope::MAX_RESULTS - count($pendingIds)))->created();
        $ids = [...$pendingIds, ...$this->pending->store($created)];

        $this->pending->expireOverflow($ids);

        return $ids;
    }

    private function search(int $round, SearchScope $scope): SuggestionSearch
    {
        $search = new SuggestionSearch($scope, $this->blockedKeys->all(), $this->blockedKeys->expired(), SearchBudget::deadline());
        $sources = $this->sourcesFor($scope);
        $owned = $this->similarTitles->owned();

        foreach ($this->pagesFrom($round) as $page) {
            if ($search->isExhausted() || $this->availability->isUnavailable()) {
                break;
            }

            $found = $this->collector->collect($sources, $search, $page);

            if ($found === []) {
                break;
            }

            $this->verify($search, $this->ranker->rank($found), $owned);
        }

        return $search;
    }

    /**
     * The requested authors when there are any, otherwise your books, without the excluded authors.
     *
     * @return list<Source>
     */
    private function sourcesFor(SearchScope $scope): array
    {
        if ($scope->hasAuthors()) {
            return array_map(Source::requested(...), $scope->authors);
        }

        return array_values(array_filter(
            $this->sources->pick(),
            fn (Source $source): bool => $source->author === null || ! $scope->excludesAny([$source->author]),
        ));
    }

    /**
     * The page of this round first, then the following ones, each at most once.
     *
     * @return list<int>
     */
    private function pagesFrom(int $round): array
    {
        return array_map(
            fn (int $turn): int => ($round + $turn) % self::PAGES + 1,
            range(0, self::PAGES - 1),
        );
    }

    /**
     * @param  list<Suggestion>  $ranked
     * @param  list<array{title: string, author: string}>  $owned
     */
    private function verify(SuggestionSearch $search, array $ranked, array $owned): void
    {
        $scope = $search->scope();

        foreach ($ranked as $suggestion) {
            if ($search->isExhausted()) {
                return;
            }

            // Checked before the lookup, so a skipped return does not spend one.
            $isReturning = $search->isExpired(SuggestionCollector::keysOf($suggestion->candidate));

            if (! $search->allowsAuthor($suggestion->authorKey())
                || ! $search->allowsReturning($isReturning)
                || ! $this->fitsRequest($scope, $suggestion->candidate)) {
                continue;
            }

            $search->countLookup($suggestion);
            $verified = $this->editions->localize($suggestion);

            if ($verified === null || ! $this->fitsRequest($scope, $verified->candidate)) {
                continue;
            }

            $keys = $this->identityKeysOf($suggestion, $verified);

            // The Portuguese title may be a book you already have under another ISBN.
            if ($search->isBlocked($keys) || $this->isKnownAuthorOrTitle($suggestion, $verified, $owned)) {
                continue;
            }

            // The Portuguese edition may be the one that expired.
            $isReturning = $isReturning || $search->isExpired($keys);

            if (! $search->allowsReturning($isReturning)) {
                continue;
            }

            $search->accept($this->withPageCount($this->withOwnCover($suggestion, $verified, $search), $scope), $keys, $isReturning);
        }
    }

    /**
     * Excluded authors are never in a result; with a page limit, a work of unknown or larger length is dropped.
     */
    private function fitsRequest(SearchScope $scope, BookCandidate $candidate): bool
    {
        if ($scope->excludesAny($candidate->authors)) {
            return false;
        }

        return $scope->maxPages === null || ($candidate->pages !== null && $candidate->pages <= $scope->maxPages);
    }

    private function withPageCount(Suggestion $suggestion, SearchScope $scope): Suggestion
    {
        $pages = $suggestion->candidate->pages;

        if (! $scope->isRequest || $pages === null) {
            return $suggestion;
        }

        return $suggestion->withCandidate(
            $suggestion->candidate,
            $suggestion->reason.' · '.__(':count páginas', ['count' => $pages]),
        );
    }

    /**
     * The edition may name another author (a publisher), so the work's own authors are part of its identity.
     *
     * @return list<string>
     */
    private function identityKeysOf(Suggestion $suggestion, Suggestion $verified): array
    {
        return [
            ...SuggestionCollector::keysOf($verified->candidate),
            ...BookIdentity::keys($verified->candidate->title, $suggestion->candidate->authors),
        ];
    }

    /**
     * @param  list<array{title: string, author: string}>  $owned
     */
    private function isKnownAuthorOrTitle(Suggestion $suggestion, Suggestion $verified, array $owned): bool
    {
        // The searched author counts too: the edition may spell the name differently.
        $authors = [...$verified->candidate->authors, ...$suggestion->candidate->authors, (string) $suggestion->basedOn->author];

        return BookIdentity::isAuthorName($verified->candidate->title, $authors)
            || $this->similarTitles->isOwned($verified->candidate->title, $authors, $owned);
    }

    private function withOwnCover(Suggestion $suggestion, Suggestion $verified, SuggestionSearch $search): Suggestion
    {
        if ($search->isOutOfTime()) {
            return $verified;
        }

        return $this->editions->withOwnCover($verified, $suggestion->candidate->coverUrl);
    }
}
