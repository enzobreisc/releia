<?php

namespace App\Services\Recommendation;

use App\Services\Ai\EmbeddingProvider;
use App\Services\Ai\EmbeddingText;
use App\Services\Ai\EmbeddingUnavailable;
use Illuminate\Support\Facades\Cache;

final readonly class CandidateEmbeddings
{
    private const CACHE_KEY_PREFIX = 'embedding:';

    private const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

    public function __construct(
        private EmbeddingProvider $provider,
        private string $prefix,
    ) {}

    /**
     * @param  list<Suggestion>  $suggestions
     * @return list<list<float>> one vector per suggestion, in the same order
     *
     * @throws EmbeddingUnavailable
     */
    public function vectorsFor(array $suggestions): array
    {
        $model = $this->provider->model();
        $keys = [];
        $textsByKey = [];

        foreach ($suggestions as $suggestion) {
            $text = EmbeddingText::forCandidate($suggestion->candidate);
            $key = self::CACHE_KEY_PREFIX.$model.':'.EmbeddingText::hash($text, $this->prefix);

            $keys[] = $key;
            $textsByKey[$key] = $text;
        }

        $cached = $this->cachedVectors($keys);
        $missingTextsByKey = array_diff_key($textsByKey, $cached);
        $fresh = $this->embedAndCache($missingTextsByKey);

        $vectorsByKey = $cached + $fresh;

        return array_map(fn (string $key): array => $vectorsByKey[$key], $keys);
    }

    /**
     * @param  list<string>  $keys
     * @return array<string, list<float>>
     */
    private function cachedVectors(array $keys): array
    {
        $vectors = [];

        foreach (Cache::many($keys) as $key => $cached) {
            $vector = self::vectorFrom($cached);

            if ($vector !== null) {
                $vectors[$key] = $vector;
            }
        }

        return $vectors;
    }

    /**
     * Cache entries are untyped, so anything that is not a list of floats counts as a miss.
     *
     * @return list<float>|null
     */
    private static function vectorFrom(mixed $cached): ?array
    {
        if (! is_array($cached) || ! array_is_list($cached)) {
            return null;
        }

        $vector = [];

        foreach ($cached as $value) {
            if (! is_float($value)) {
                return null;
            }

            $vector[] = $value;
        }

        return $vector;
    }

    /**
     * Identical texts share one key, so they are sent once and the vector is reused for each position.
     *
     * @param  array<string, string>  $textsByKey
     * @return array<string, list<float>>
     *
     * @throws EmbeddingUnavailable
     */
    private function embedAndCache(array $textsByKey): array
    {
        if ($textsByKey === []) {
            return [];
        }

        $vectors = $this->provider->embed(array_values($textsByKey));
        $vectorsByKey = array_combine(array_keys($textsByKey), $vectors);

        Cache::putMany($vectorsByKey, self::CACHE_TTL_SECONDS);

        return $vectorsByKey;
    }
}
