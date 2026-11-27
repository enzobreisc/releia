<?php

namespace App\Services\Ai;

use RuntimeException;
use Throwable;

final class InterpreterUnavailable extends RuntimeException
{
    public function __construct(public readonly InterpreterAvailability $availability, ?Throwable $previous = null)
    {
        parent::__construct("The request interpreter is unavailable: {$availability->value}.", previous: $previous);
    }
}
