<?php

namespace App\Services\Recommendation;

use App\Models\Setting;
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
        $created = $this->search($round)->created();

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

    private function search(int $round): SuggestionSearch
    {
        $search = new SuggestionSearch($this->blockedKeys->all(), $this->blockedKeys->expired(), SearchBudget::deadline());
        $sources = $this->sources->pick();
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
        foreach ($ranked as $suggestion) {
            if ($search->isExhausted()) {
                return;
            }

            // Checked before the lookup, so a skipped return does not spend one.
            $isReturning = $search->isExpired(SuggestionCollector::keysOf($suggestion->candidate));

            if (! $search->allowsAuthor($suggestion->authorKey()) || ! $search->allowsReturning($isReturning)) {
                continue;
            }

            $search->countLookup($suggestion);
            $verified = $this->editions->localize($suggestion);

            if ($verified === null) {
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

            $search->accept($this->withOwnCover($suggestion, $verified, $search), $keys, $isReturning);
        }
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
