import type { BookRow, ReadingRow, ReadingStatus } from '../state/types';
import { compareText } from '../support/collections';
import { dayOf, yearOf } from '../support/day';
import { bookOf } from './books';
import type { ReadModel } from './read-model';

type TimelineStatus = Exclude<ReadingStatus, 'want_to_read'>;

/** A reading the timeline shows: started, and not merely wanted. */
type DatedReading = ReadingRow & {
    started_at: string;
    status: TimelineStatus;
};

export type TimelineEntry = {
    reading: DatedReading;
    book: BookRow;
    isReread: boolean;
    startedOn: string;
    endedOn: string | null;
};

type TimelineYearEntries = { year: number; entries: TimelineEntry[] };

function isDated(reading: ReadingRow): reading is DatedReading {
    return reading.started_at !== null && reading.status !== 'want_to_read';
}

function startedFirst(left: DatedReading, right: DatedReading): number {
    return compareText(left.started_at, right.started_at) || left.id - right.id;
}

/** A reading after the first of its book is a reread. */
function withRereadFlags(
    readings: readonly DatedReading[],
): Array<{ reading: DatedReading; isReread: boolean }> {
    return readings.map((reading, index) => ({
        reading,
        isReread: readings
            .slice(0, index)
            .some((earlier) => earlier.book_id === reading.book_id),
    }));
}

/** The day the reading ended, or the start day when no end was recorded. A reading in progress has none. */
function endedOn(reading: DatedReading): string | null {
    if (reading.status === 'reading') {
        return null;
    }

    return dayOf(reading.finished_at ?? reading.started_at);
}

function timelineEntries(model: ReadModel): TimelineEntry[] {
    const readings = model.state.tables.readings
        .filter(isDated)
        .sort(startedFirst);

    return withRereadFlags(readings).map(({ reading, isReread }) => ({
        reading,
        book: bookOf(model, reading.book_id),
        isReread,
        startedOn: dayOf(reading.started_at),
        endedOn: endedOn(reading),
    }));
}

function yearsSpannedBy(entry: TimelineEntry, today: string): number[] {
    const firstYear = yearOf(entry.startedOn);
    const lastYear = yearOf(entry.endedOn ?? today);

    return Array.from(
        { length: lastYear - firstYear + 1 },
        (_, index) => firstYear + index,
    );
}

/** Entries grouped by every calendar year they touch, most recent year first. */
export function timelineYears(model: ReadModel): TimelineYearEntries[] {
    const entriesByYear = new Map<number, TimelineEntry[]>();

    for (const entry of timelineEntries(model)) {
        for (const year of yearsSpannedBy(entry, model.today)) {
            entriesByYear.set(year, [
                ...(entriesByYear.get(year) ?? []),
                entry,
            ]);
        }
    }

    return [...entriesByYear.entries()]
        .sort(([left], [right]) => right - left)
        .map(([year, entries]) => ({ year, entries }));
}
