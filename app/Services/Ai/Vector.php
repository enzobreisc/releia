<?php

namespace App\Services\Ai;

use InvalidArgumentException;

final class Vector
{
    private const FLOAT32_LITTLE_ENDIAN = 'g*';

    /**
     * @param  list<float>  $vector
     */
    public static function pack(array $vector): string
    {
        return pack(self::FLOAT32_LITTLE_ENDIAN, ...$vector);
    }

    /**
     * @return list<float>
     */
    public static function unpack(string $binary): array
    {
        return array_values(array_map(floatval(...), unpack(self::FLOAT32_LITTLE_ENDIAN, $binary) ?: []));
    }

    /**
     * @param  list<float>  $a
     * @param  list<float>  $b
     *
     * @throws InvalidArgumentException
     */
    public static function cosineSimilarity(array $a, array $b): float
    {
        if ($a === [] || count($a) !== count($b)) {
            throw new InvalidArgumentException('Vectors must be non-empty and of the same length.');
        }

        $dotProduct = array_sum(array_map(fn (float $x, float $y): float => $x * $y, $a, $b));
        $magnitudeA = sqrt(array_sum(array_map(fn (float $x): float => $x * $x, $a)));
        $magnitudeB = sqrt(array_sum(array_map(fn (float $y): float => $y * $y, $b)));

        if ($magnitudeA === 0.0 || $magnitudeB === 0.0) {
            return 0.0;
        }

        return $dotProduct / ($magnitudeA * $magnitudeB);
    }
}
