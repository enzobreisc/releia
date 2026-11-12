<?php

namespace App\Services\Recommendation;

/**
 * Extension point for layers 2 and 3 (embeddings and AI), which reorder candidates
 * before they become suggestions. Until then, the search order is kept.
 */
interface CandidateRanker
{
    /**
     * @param  list<Suggestion>  $suggestions
     * @return list<Suggestion>
     */
    public function rank(array $suggestions): array;
}
