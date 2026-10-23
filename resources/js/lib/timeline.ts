import type { TimelineReading, TimelineYear } from '@/types';

/** Bars closer than this share a lane (fraction of the year). */
const LANE_GAP = 0.004;

export type Segment = {
    reading: TimelineReading;
    from: number;
    to: number;
    lane: number;
};

export type YearLane = {
    year: number;
    segments: Segment[];
    laneCount: number;
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

function toSegment(
    reading: TimelineReading,
    year: number,
    today: string,
): Omit<Segment, 'lane'> {
    const end = reading.finished_at ?? today;
    const startsThisYear = Number(reading.started_at.slice(0, 4)) === year;
    const endsThisYear = Number(end.slice(0, 4)) === year;

    return {
        reading,
        from: startsThisYear ? yearFraction(reading.started_at) : 0,
        to: endsThisYear ? yearFraction(end, true) : 1,
    };
}

function assignLanes(segments: Omit<Segment, 'lane'>[]): Segment[] {
    const laneEnds: number[] = [];

    return [...segments]
        .sort((a, b) => a.from - b.from)
        .map((segment) => {
            let lane = laneEnds.findIndex(
                (end) => end <= segment.from - LANE_GAP,
            );

            if (lane === -1) {
                lane = laneEnds.length;
            }

            laneEnds[lane] = segment.to;

            return { ...segment, lane };
        });
}

export function buildYearLanes(
    years: TimelineYear[],
    today: string,
): YearLane[] {
    return years.map(({ year, readings }) => {
        const segments = assignLanes(
            readings.map((reading) => toSegment(reading, year, today)),
        );

        return {
            year,
            segments,
            laneCount: Math.max(1, ...segments.map(({ lane }) => lane + 1)),
        };
    });
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
