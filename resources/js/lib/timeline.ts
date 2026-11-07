import type { TimelineReading, TimelineYear } from '@/types';

export type Segment = {
    reading: TimelineReading;
    from: number;
    to: number;
};

export function isOngoing(reading: TimelineReading): boolean {
    return reading.status === 'reading';
}

const DAY_MS = 86_400_000;

/** Position of a day within its year: 0 on Jan 1; with `inclusive`, 1 on Dec 31. */
export function yearFraction(date: string, inclusive = false): number {
    const [year, month, day] = date.split('-').map(Number);
    const start = Date.UTC(year, 0, 1);
    const daysInYear = (Date.UTC(year + 1, 0, 1) - start) / DAY_MS;
    const dayIndex = (Date.UTC(year, month - 1, day) - start) / DAY_MS;

    return (dayIndex + (inclusive ? 1 : 0)) / daysInYear;
}

export function endYear(reading: TimelineReading, today: string): number {
    return Number((reading.finished_at ?? today).slice(0, 4));
}

export function toSegment(
    reading: TimelineReading,
    year: number,
    today: string,
): Segment {
    const end = reading.finished_at ?? today;
    const startsThisYear = Number(reading.started_at.slice(0, 4)) === year;
    const endsThisYear = Number(end.slice(0, 4)) === year;

    return {
        reading,
        from: startsThisYear ? yearFraction(reading.started_at) : 0,
        to: endsThisYear ? yearFraction(end, true) : 1,
    };
}

/** Each reading's bar within a year; readings crossing a year edge are cut at it. */
export function buildYearSegments(
    readings: TimelineReading[],
    year: number,
    today: string,
): Segment[] {
    return readings.map((reading) => toSegment(reading, year, today));
}

/** Readings shown under the year they ended (or today's year while ongoing). */
export function readingsEndingIn(
    years: TimelineYear[],
    year: number,
    today: string,
): TimelineReading[] {
    return (years.find((group) => group.year === year)?.readings ?? [])
        .filter((reading) => endYear(reading, today) === year)
        .sort((a, b) =>
            (a.finished_at ?? today).localeCompare(b.finished_at ?? today),
        );
}

export function monthOf(date: string): number {
    return Number(date.slice(5, 7));
}

function utcDay(date: string): number {
    const [year, month, day] = date.split('-').map(Number);

    return Date.UTC(year, month - 1, day);
}

/** Days from the first to the last one, both counted. */
export function readingDays(reading: TimelineReading, today: string): number {
    const end = reading.finished_at ?? today;

    return (utcDay(end) - utcDay(reading.started_at)) / DAY_MS + 1;
}

export function dayOf(date: string): number {
    return Number(date.slice(8, 10));
}

export function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthStart(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEnd(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
}

/** Readings with at least one day in the month, oldest start first. */
export function readingsInMonth(
    years: TimelineYear[],
    year: number,
    month: number,
    today: string,
): TimelineReading[] {
    const first = monthStart(year, month);
    const last = monthEnd(year, month);
    const seen = new Map<number, TimelineReading>();

    years.forEach(({ readings }) =>
        readings.forEach((reading) => seen.set(reading.id, reading)),
    );

    return [...seen.values()]
        .filter(
            (reading) =>
                reading.started_at <= last &&
                (reading.finished_at ?? today) >= first,
        )
        .sort((a, b) => a.started_at.localeCompare(b.started_at));
}
