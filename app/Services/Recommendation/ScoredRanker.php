<?php

namespace App\Services\Recommendation;

/**
 * Orders by score: affinity with the books you loved, then popularity.
 * A small random jitter shuffles candidates with close scores, so two consecutive searches
 * do not always return the same list.
 */
final class ScoredRanker implements CandidateRanker
{
    private const JITTER = 0.8;

    public function rank(array $suggestions): array
    {
        $scored = array_map(
            fn (Suggestion $suggestion) => [$suggestion, $suggestion->score() + self::JITTER * mt_rand() / mt_getrandmax()],
            $suggestions,
        );

        usort($scored, fn (array $a, array $b) => $b[1] <=> $a[1]);

        return array_column($scored, 0);
    }
}
