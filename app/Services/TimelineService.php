<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Reading;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class TimelineService
{
    /**
     * Readings grouped by every calendar year they touch, most recent year first.
     * A reading that spans several years shows up in each of them.
     *
     * @return list<array{year: int, entries: list<TimelineEntry>}>
     */
    public function years(): array
    {
        $today = CarbonImmutable::today();
        $years = [];

        foreach ($this->entries() as $entry) {
            $lastYear = ($entry->endedOn ?? $today)->year;

            for ($year = $entry->startedOn->year; $year <= $lastYear; $year++) {
                $years[$year][] = $entry;
            }
        }

        krsort($years);

        return array_map(
            fn (int $year, array $entries) => ['year' => $year, 'entries' => $entries],
            array_keys($years),
            array_values($years),
        );
    }

    /**
     * Started readings in chronological order. Any reading after the first of a book is a reread.
     *
     * @return Collection<int, TimelineEntry>
     */
    private function entries(): Collection
    {
        $seenBooks = [];

        return Reading::query()
            ->with('book')
            ->whereNotNull('started_at')
            ->whereIn('status', [ReadingStatus::Reading, ReadingStatus::Read, ReadingStatus::Abandoned])
            ->orderBy('started_at')
            ->orderBy('id')
            ->get()
            ->map(function (Reading $reading) use (&$seenBooks) {
                $isReread = isset($seenBooks[$reading->book_id]);
                $seenBooks[$reading->book_id] = true;

                return new TimelineEntry(
                    $reading,
                    $isReread,
                    $reading->started_at->toImmutable(),
                    $this->endedOn($reading),
                );
            });
    }

    private function endedOn(Reading $reading): ?CarbonImmutable
    {
        if ($reading->status === ReadingStatus::Reading) {
            return null;
        }

        return ($reading->finished_at ?? $reading->started_at)->toImmutable();
    }
}
