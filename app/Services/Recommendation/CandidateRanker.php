<?php

namespace App\Services\Recommendation;

/**
 * Ponto de encaixe para as camadas 2 e 3 (embeddings e IA): reordena os candidatos
 * antes de virarem sugestões. Por enquanto a ordem é a da busca.
 */
interface CandidateRanker
{
    /**
     * @param  list<Suggestion>  $suggestions
     * @return list<Suggestion>
     */
    public function rank(array $suggestions): array;
}
