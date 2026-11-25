<?php

namespace App\Services\Recommendation;

/**
 * Reorders the candidates a search found, before their editions are verified.
 *
 * Contract: returns the same suggestions in a new order, never filters or adds any;
 * the caller decides how many to keep. `$deadline` is the search deadline (see SearchBudget),
 * so a ranker that calls a network service can skip that work and fall back to ordering by score.
 */
interface CandidateRanker
{
    /**
     * @param  list<Suggestion>  $suggestions
     * @return list<Suggestion>
     */
    public function rank(array $suggestions, float $deadline): array;
}
