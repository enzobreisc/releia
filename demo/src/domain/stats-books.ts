import type { NamedCount } from '@/types';
import type { BookRow, ReadingRow } from '../state/types';
import { compareText } from '../support/collections';
import { dayOf, yearOf } from '../support/day';
import { authorsOf, bookOf, readingsOfBook } from './books';
import type { ReadModel } from './read-model';
import { containsDay, type StatsPeriod } from './stats-period';

const MS_PER_DAY = 86_400_000;
const YEAR_KEY_LENGTH = 4;
const MONTH_KEY_LENGTH = 7;
const MONTHS_PER_YEAR = 12;
const DEFAULT_TOP_LIMIT = 5;

export type ConcludedReading = ReadingRow & { finished_at: string };
export type ConcludedSpan = ConcludedReading & { started_at: string };
type BucketCount = { key: string; count: number };
type MonthCount = { month: string; count: number };

type Labelled = { key: string | number; label: string };

function isConcluded(
    reading: ReadingRow,
    period: StatsPeriod,
): reading is ConcludedReading {
    return (
        reading.status === 'read' &&
        reading.finished_at !== null &&
        containsDay(period, dayOf(reading.finished_at))
    );
}

/** Readings finished in the period: the books the statistics count, rereads included. */
export function concludedReadings(
    model: ReadModel,
    period: StatsPeriod,
): ConcludedReading[] {
    return model.state.tables.readings.filter(
        (reading): reading is ConcludedReading => isConcluded(reading, period),
    );
}

/** A concluded reading that has an earlier reading of the same book. */
export function rereadsIn(
    model: ReadModel,
    period: StatsPeriod,
): ConcludedReading[] {
    return concludedReadings(model, period).filter((reading) =>
        readingsOfBook(model, reading.book_id).some(
            (other) => other.id < reading.id,
        ),
    );
}

/** Timestamps are read as UTC: only their differences matter. */
function timestampOf(value: string): number {
    const [day, time = '00:00:00'] = value.split(' ');

    return Date.parse(`${day}T${time}Z`);
}

/** Days between two stored datetimes, fractions included, as julianday() subtracts them. */
export function spanDays(from: string, to: string): number {
    return (timestampOf(to) - timestampOf(from)) / MS_PER_DAY;
}

function byCountThenLabel(left: NamedCount, right: NamedCount): number {
    return right.count - left.count || compareText(left.label, right.label);
}

/** Counts the labels by key, most frequent first; ties sort alphabetically. */
function rankedCounts(
    labels: readonly Labelled[],
    limit: number,
): NamedCount[] {
    const groups = new Map<string | number, NamedCount>();

    for (const { key, label } of labels) {
        const count = groups.get(key)?.count ?? 0;

        groups.set(key, { label, count: count + 1 });
    }

    return [...groups.values()].sort(byCountThenLabel).slice(0, limit);
}

export function genreCounts(
    model: ReadModel,
    period: StatsPeriod,
    limit: number,
): NamedCount[] {
    const labels = concludedReadings(model, period).flatMap((reading) => {
        const genre = bookOf(model, reading.book_id).genre;

        return genre === null ? [] : [{ key: genre, label: genre }];
    });

    return rankedCounts(labels, limit);
}

/** A book with two authors counts for both of them. */
export function authorCounts(
    model: ReadModel,
    period: StatsPeriod,
    limit: number,
): NamedCount[] {
    const labels = concludedReadings(model, period).flatMap((reading) =>
        authorsOf(model, reading.book_id).map((author) => ({
            key: author.id,
            label: author.name,
        })),
    );

    return rankedCounts(labels, limit);
}

function finishedKey(reading: ConcludedReading, length: number): string {
    return dayOf(reading.finished_at).slice(0, length);
}

/** Books per year for the history, per month otherwise; empty buckets are kept. */
export function booksPerBucket(
    model: ReadModel,
    period: StatsPeriod,
): BucketCount[] {
    const keyLength = period.history ? YEAR_KEY_LENGTH : MONTH_KEY_LENGTH;
    const counts = new Map<string, number>();

    for (const reading of concludedReadings(model, period)) {
        const key = finishedKey(reading, keyLength);

        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return bucketKeys(period).map((key) => ({
        key,
        count: counts.get(key) ?? 0,
    }));
}

function bucketKeys(period: StatsPeriod): string[] {
    const firstYear = yearOf(period.start);

    if (period.history) {
        return yearsBetween(firstYear, yearOf(period.end));
    }

    return Array.from(
        { length: MONTHS_PER_YEAR },
        (_, index) => `${firstYear}-${String(index + 1).padStart(2, '0')}`,
    );
}

function yearsBetween(firstYear: number, lastYear: number): string[] {
    const keys: string[] = [];

    for (let year = firstYear; year <= lastYear; year++) {
        keys.push(String(year));
    }

    return keys;
}

function spanOf(reading: ConcludedSpan): number {
    return spanDays(reading.started_at, reading.finished_at);
}

/** The shortest span from start to finish; ties go to the lower id. */
export function fastestReading(
    model: ReadModel,
    period: StatsPeriod,
): ReadingRow | null {
    const spans = concludedReadings(model, period).filter(
        (reading): reading is ConcludedSpan => reading.started_at !== null,
    );

    return (
        [...spans].sort(
            (left, right) => spanOf(left) - spanOf(right) || left.id - right.id,
        )[0] ?? null
    );
}

function pagesOf(model: ReadModel, reading: ReadingRow): number {
    return bookOf(model, reading.book_id).pages ?? 0;
}

/** The book with the most pages; ties go to the lower reading id. */
export function longestReading(
    model: ReadModel,
    period: StatsPeriod,
): ReadingRow | null {
    const withPages = concludedReadings(model, period).filter(
        (reading) => bookOf(model, reading.book_id).pages !== null,
    );

    return (
        [...withPages].sort(
            (left, right) =>
                pagesOf(model, right) - pagesOf(model, left) ||
                left.id - right.id,
        )[0] ?? null
    );
}

/** Month with the most finished books. Ties go to the earlier month. */
export function bestMonth(
    model: ReadModel,
    period: StatsPeriod,
): MonthCount | null {
    const labels = concludedReadings(model, period).map((reading) => {
        const month = finishedKey(reading, MONTH_KEY_LENGTH);

        return { key: month, label: month };
    });
    const [best] = rankedCounts(labels, 1);

    return best === undefined ? null : { month: best.label, count: best.count };
}

/** Descending page order with books of unknown length last, as SQLite sorts NULL. */
function comparePagesDesc(left: BookRow, right: BookRow): number {
    if (left.pages === null || right.pages === null) {
        return Number(left.pages === null) - Number(right.pages === null);
    }

    return right.pages - left.pages;
}

/** Best readings by rating. Ties go to more pages, then the most recent. */
export function topRated(
    model: ReadModel,
    period: StatsPeriod,
    limit = DEFAULT_TOP_LIMIT,
): ConcludedReading[] {
    return concludedReadings(model, period)
        .filter((reading) => reading.rating !== null)
        .sort(
            (left, right) =>
                (right.rating ?? 0) - (left.rating ?? 0) ||
                comparePagesDesc(
                    bookOf(model, left.book_id),
                    bookOf(model, right.book_id),
                ) ||
                compareText(right.finished_at, left.finished_at) ||
                left.id - right.id,
        )
        .slice(0, limit);
}
