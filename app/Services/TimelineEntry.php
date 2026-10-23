<?php

namespace App\Services;

use App\Models\Reading;
use Carbon\CarbonInterface;

/** One reading placed on the timeline. */
final readonly class TimelineEntry
{
    public function __construct(
        public Reading $reading,
        public bool $isReread,
        public CarbonInterface $startedOn,
        /** Null while the book is still being read. */
        public ?CarbonInterface $endedOn,
    ) {}
}
