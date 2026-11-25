<?php

namespace App\Services\Recommendation;

use App\Models\Setting;
use App\Services\Ai\EmbeddingProvider;
use App\Services\Ai\EmbeddingUnavailable;
use Illuminate\Support\Facades\Log;

/**
 * Blends the candidate's own score with how close it is to the books you liked (embeddings).
 * Falls back to ScoredRanker when there is no time, no liked book with a vector, or Ollama is down.
 */
final readonly class EmbeddingRanker implements CandidateRanker
{
    public const SETTING = 'ai.enabled';

    /** Reserved after the embedding call, for verifying the editions of the reordered candidates. */
    private const VERIFICATION_MARGIN_SECONDS = 3;

    /**
     * Score weighs more because candidate titles are often not in Portuguese and their text is sparse,
     * which makes the embedding less reliable than the score.
     */
    private const SCORE_WEIGHT = 0.6;

    private const SIMILARITY_WEIGHT = 0.4;

    private const JITTER_WEIGHT = 0.1;

    public function __construct(
        private CandidateEmbeddings $embeddings,
        private EmbeddingProvider $provider,
        private SourceBooks $sources,
        private ScoredRanker $fallback,
    ) {}

    public static function isEnabled(): bool
    {
        return Setting::get(self::SETTING, false) === true;
    }

    public function rank(array $suggestions, float $deadline): array
    {
        if ($suggestions === []) {
            return [];
        }

        if ($deadline - microtime(true) < $this->provider->timeoutSeconds() + self::VERIFICATION_MARGIN_SECONDS) {
            return $this->fallback->rank($suggestions, $deadline);
        }

        $profile = TasteProfile::fromLiked($this->sources->liked(), $this->provider->model());

        if ($profile->isEmpty()) {
            return $this->fallback->rank($suggestions, $deadline);
        }

        try {
            $vectors = $this->embeddings->vectorsFor($suggestions);
        } catch (EmbeddingUnavailable $exception) {
            Log::warning('Embeddings unavailable, ordering by score', ['error' => $exception->getMessage()]);

            return $this->fallback->rank($suggestions, $deadline);
        }

        $similarities = array_map(fn (array $vector): float => $profile->similarityTo($vector), $vectors);
        $scores = array_map(fn (Suggestion $suggestion): float => $suggestion->score(), $suggestions);
        $normalizedScores = self::normalize($scores);
        $normalizedSimilarities = self::normalize($similarities);

        $blended = [];

        foreach ($suggestions as $position => $suggestion) {
            $blended[] = [
                $suggestion,
                self::SCORE_WEIGHT * $normalizedScores[$position]
                + self::SIMILARITY_WEIGHT * $normalizedSimilarities[$position]
                + self::JITTER_WEIGHT * mt_rand() / mt_getrandmax(),
            ];
        }

        usort($blended, fn (array $a, array $b): int => $b[1] <=> $a[1]);

        return array_column($blended, 0);
    }

    /**
     * Min-max scaling to 0..1 within the batch; when every value is equal, they all become 1.
     *
     * @param  list<float>  $values
     * @return list<float>
     */
    private static function normalize(array $values): array
    {
        if ($values === []) {
            return [];
        }

        $min = min($values);
        $range = max($values) - $min;

        if ($range === 0.0) {
            return array_fill(0, count($values), 1.0);
        }

        return array_map(fn (float $value): float => ($value - $min) / $range, $values);
    }
}
