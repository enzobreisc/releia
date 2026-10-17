<?php

namespace App\Services\Recommendation;

/**
 * Ordena pela pontuação: afinidade com os livros que você amou, depois popularidade.
 * Um pequeno sorteio mistura os candidatos de pontuação próxima, para duas buscas seguidas
 * não devolverem sempre a mesma lista.
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
