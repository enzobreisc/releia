<?php

namespace App\Services;

use App\Models\ReadingSession;
use Illuminate\Support\Carbon;

/**
 * Daily activity: pages per day, reading streak and heatmap levels. Kept out of
 * ReadingService so the statistics can reuse the same calculations.
 */
class ReadingActivity
{
    /**
     * @return array<string, int> day (Y-m-d) => pages
     */
    public function pagesByDay(Carbon $from, Carbon $to): array
    {
        return ReadingSession::query()
            ->whereRaw('date(read_on) between ? and ?', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('date(read_on) as day, sum(page_to - page_from + 1) as pages')
            ->groupBy('day')
            ->pluck('pages', 'day')
            ->map(fn ($pages) => (int) $pages)
            ->all();
    }

    public function pagesOn(Carbon $day): int
    {
        return $this->pagesByDay($day, $day)[$day->toDateString()] ?? 0;
    }

    /** Average pages on the days that had reading; null before the first session. */
    public function averagePagesPerReadingDay(): ?float
    {
        $totals = ReadingSession::query()
            ->toBase()
            ->selectRaw('count(distinct date(read_on)) as days, sum(page_to - page_from + 1) as pages')
            ->first();

        $days = (int) ($totals->days ?? 0);

        return $days > 0 ? round((int) $totals->pages / $days, 1) : null;
    }

    /**
     * Days with at least one session, in ascending order (Y-m-d).
     *
     * @return list<string>
     */
    public function daysWithSessions(): array
    {
        return array_values(ReadingSession::query()
            ->selectRaw('date(read_on) as day')
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('day')
            ->map(fn ($day) => (string) $day)
            ->all());
    }

    /**
     * @return list<int>
     */
    public function lastWeekLevels(Carbon $today): array
    {
        $pages = $this->pagesByDay($today->copy()->subDays(6), $today);

        $levels = [];

        for ($offset = 6; $offset >= 0; $offset--) {
            $levels[] = self::level($pages[$today->copy()->subDays($offset)->toDateString()] ?? 0);
        }

        return $levels;
    }

    /**
     * Level 0 (no reading) to 4, by pages read on the day. Uses the same scale as the
     * statistics, so the mini map and the calendar always agree.
     */
    public static function level(int $pages): int
    {
        return StatsService::heatLevel($pages);
    }

    /**
     * Consecutive days with reading. If today has no session yet, the current streak still
     * counts from yesterday; it is only lost once a day ends without reading.
     *
     * @param  list<string>  $days  days with reading (Y-m-d)
     * @return array{current: int, longest: int}
     */
    public static function streak(array $days, Carbon $today): array
    {
        $set = array_fill_keys($days, true);

        $longest = 0;
        $run = 0;
        $previous = null;

        $sorted = array_keys($set);
        sort($sorted);

        foreach ($sorted as $day) {
            $date = Carbon::parse($day)->startOfDay();
            $run = $previous !== null && $previous->copy()->addDay()->isSameDay($date) ? $run + 1 : 1;
            $longest = max($longest, $run);
            $previous = $date;
        }

        $cursor = isset($set[$today->toDateString()]) ? $today->copy() : $today->copy()->subDay();
        $current = 0;

        while (isset($set[$cursor->toDateString()])) {
            $current++;
            $cursor->subDay();
        }

        return ['current' => $current, 'longest' => $longest];
    }
}
