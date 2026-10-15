<?php

namespace App\Services\Recommendation;

/** Camada 1: mantém a ordem da busca (mesmo autor antes de assunto em comum). */
final class OriginalOrderRanker implements CandidateRanker
{
    public function rank(array $suggestions): array
    {
        return $suggestions;
    }
}
