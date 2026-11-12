<?php

namespace App\Services\Recommendation;

use App\Models\Setting;

final class SuggestionGenerator
{
    private const MAX_NEW = 20;

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
        $created = $this->verify($this->ranker->rank($found), $blocked, $deadline);

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

        foreach ($ranked as $attempt => $suggestion) {
            if (count($created) >= self::MAX_NEW || $attempt >= self::MAX_NEW * 2 || SearchBudget::isExceeded($deadline)) {
                break;
            }

            $verified = $this->editions->localize($suggestion);

            if ($verified === null) {
                continue;
            }

            $keys = SuggestionCollector::keysOf($verified->candidate);

            // The Portuguese title may be a book you already have under another ISBN.
            if (array_intersect_key(array_flip($keys), $blocked) !== []) {
                continue;
            }

            foreach ($keys as $key) {
                $blocked[$key] = true;
            }

            $created[] = $verified;
        }

        return $created;
    }
}
