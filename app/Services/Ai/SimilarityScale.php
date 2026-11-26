<?php

namespace App\Services\Ai;

use InvalidArgumentException;

/**
 * Maps a raw cosine similarity onto 0..1, where everything at or below the floor counts as 0.
 */
final readonly class SimilarityScale
{
    public const DEFAULT_FLOOR = 0.63;

    public const DEFAULT_CEILING = 0.94;

    /**
     * @throws InvalidArgumentException when the ceiling is not above the floor
     */
    public function __construct(
        private float $floor,
        private float $ceiling,
    ) {
        if ($ceiling <= $floor) {
            throw new InvalidArgumentException('The similarity ceiling must be above the floor.');
        }
    }

    public function normalize(float $cosine): float
    {
        return max(0.0, min(1.0, ($cosine - $this->floor) / ($this->ceiling - $this->floor)));
    }
}
