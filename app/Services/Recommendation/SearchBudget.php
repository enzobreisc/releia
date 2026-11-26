<?php

namespace App\Services\Recommendation;

/** Maximum time of one search, in seconds: past that, it keeps what it already found. */
final class SearchBudget
{
    private const SECONDS = 20;

    /** The last calls may start just before the budget ends, so the request needs room for them to time out. */
    private const REQUEST_LIMIT_SECONDS = 90;

    public static function extendRequestLimit(): void
    {
        // Zero means no limit, as on the command line.
        if ((int) ini_get('max_execution_time') > 0) {
            set_time_limit(self::REQUEST_LIMIT_SECONDS);
        }
    }

    public static function deadline(): float
    {
        return microtime(true) + self::SECONDS;
    }

    /**
     * The answer changes as the clock runs, even within one function.
     *
     * @phpstan-impure
     */
    public static function isExceeded(float $deadline): bool
    {
        return microtime(true) > $deadline;
    }
}
