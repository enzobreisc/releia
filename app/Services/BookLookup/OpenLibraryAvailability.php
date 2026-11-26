<?php

namespace App\Services\BookLookup;

/**
 * Whether Open Library is answering during this request. After a few failures in a row it is left alone,
 * since each further call would wait for its timeout and could end the request with an error.
 */
final class OpenLibraryAvailability
{
    private const FAILURES_TO_GIVE_UP = 3;

    private int $consecutiveFailures = 0;

    public function recordFailure(): void
    {
        $this->consecutiveFailures++;
    }

    public function recordAnswer(): void
    {
        $this->consecutiveFailures = 0;
    }

    public function hasJustFailed(): bool
    {
        return $this->consecutiveFailures > 0;
    }

    public function isUnavailable(): bool
    {
        return $this->consecutiveFailures >= self::FAILURES_TO_GIVE_UP;
    }
}
