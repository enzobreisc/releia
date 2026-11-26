<?php

namespace App\Services\Recommendation;

use App\Models\Setting;
use App\Support\BookIdentity;

final class SuggestionGenerator
{
    private const MAX_NEW = 20;

    /** Same author's works past this are left out: otherwise one prolific author fills the list. */
    private const MAX_WORKS_PER_AUTHOR = 3;

    /** How many searches have been made: on each one, Open Library is read on a different page. */
    private const ROUND_KEY = 'suggestion-round';

    private const PAGES = 3;

    public function __construct(
        private readonly SourceBooks $sources,
        private readonly BlockedKeys $blockedKeys,
        private readonly SuggestionCollector $collector,
        private readonly PortugueseEditions $editions,
        private readonly PendingRecommendations $pending,
        private readonly CandidateRanker $ranker = new ScoredRanker,
    ) {}

    /**
     * Finds new suggestions and returns how many were created, adding to the pending ones.
     * Each search re-draws the source books and reads another Open Library page,
     * so it does not always return the same ones.
     */
    public function generate(): int
    {
        $deadline = SearchBudget::deadline();
        $round = (int) Setting::get(self::ROUND_KEY, 0);
        $blocked = $this->blockedKeys->all();

        $found = $this->collector->collect($this->sources->pick(), $blocked, $round % self::PAGES + 1, $deadline);
        $created = $this->verify($this->ranker->rank($found, $deadline), $blocked, $deadline);

        // Nothing new on this page: the next search already reads another.
        if ($created === []) {
            Setting::put(self::ROUND_KEY, $round + 1);

            return 0;
        }

        $this->pending->store($created);
        Setting::put(self::ROUND_KEY, $round + 1);
        $this->pending->trim();

        return count($created);
    }

    /**
     * @param  list<Suggestion>  $ranked
     * @param  array<string, true>  $blocked
     * @return list<Suggestion>
     */
    private function verify(array $ranked, array $blocked, float $deadline): array
    {
        $created = [];
        $lookups = 0;
        $worksByAuthor = [];

        foreach ($ranked as $suggestion) {
            if (count($created) >= self::MAX_NEW || $lookups >= self::MAX_NEW * 2 || SearchBudget::isExceeded($deadline)) {
                break;
            }

            // Read before localizing: the Portuguese edition may name the author differently.
            $authorKey = $suggestion->authorKey();

            if ($authorKey !== null && ($worksByAuthor[$authorKey] ?? 0) >= self::MAX_WORKS_PER_AUTHOR) {
                continue;
            }

            $lookups++;
            $verified = $this->editions->localize($suggestion);

            if ($verified === null) {
                continue;
            }

            // The edition may name another author (a publisher), so the work's own authors are checked too.
            $keys = [
                ...SuggestionCollector::keysOf($verified->candidate),
                ...BookIdentity::keys($verified->candidate->title, $suggestion->candidate->authors),
            ];

            // The Portuguese title may be a book you already have under another ISBN.
            if (array_intersect_key(array_flip($keys), $blocked) !== []) {
                continue;
            }

            foreach ($keys as $key) {
                $blocked[$key] = true;
            }

            if ($authorKey !== null) {
                $worksByAuthor[$authorKey] = ($worksByAuthor[$authorKey] ?? 0) + 1;
            }

            $created[] = $verified;
        }

        return $created;
    }
}
