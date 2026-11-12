<?php

namespace App\Services\Recommendation;

/** Maximum time of one search, in seconds: past that, it keeps what it already found. */
final class SearchBudget
{
    private const SECONDS = 20;

    public static function deadline(): float
    {
        return microtime(true) + self::SECONDS;
    }

    public static function isExceeded(float $deadline): bool
    {
        return microtime(true) > $deadline;
    }
}
