<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use DateTimeInterface;

final class StatsPeriod
{
    private function __construct(
        public readonly CarbonImmutable $start,
        public readonly CarbonImmutable $end,
        public readonly bool $history,
    ) {}

    public static function year(int $year): self
    {
        return new self(
            CarbonImmutable::create($year, 1, 1)->startOfDay(),
            CarbonImmutable::create($year, 12, 31)->startOfDay(),
            history: false,
        );
    }

    public static function history(DateTimeInterface $since): self
    {
        return new self(
            CarbonImmutable::instance($since)->startOfDay(),
            CarbonImmutable::today(),
            history: true,
        );
    }

    public static function lastDays(int $days): self
    {
        $today = CarbonImmutable::today();

        return new self($today->subDays($days - 1), $today, history: false);
    }

    /** The last day that has already happened: future days have no pace. */
    public function lastDay(): CarbonImmutable
    {
        $today = CarbonImmutable::today();

        return $this->end->isAfter($today) ? $today : $this->end;
    }

    public function elapsedDays(): int
    {
        $last = $this->lastDay();

        return $last->isBefore($this->start) ? 0 : (int) $this->start->diffInDays($last) + 1;
    }

    public function daysInYear(): int
    {
        return $this->start->isLeapYear() ? 366 : 365;
    }
}
