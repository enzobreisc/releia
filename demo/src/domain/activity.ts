import { addDays } from '../state/dates';
import { phpRound } from '../support/php-round';
import { dayOf } from '../support/day';
import type { ReadingSessionRow } from '../state/types';
import type { ReadModel } from './read-model';
import { rawSessionPages, uniqueDays } from './readings';

const WEEK_LENGTH = 7;
const LEVEL_THRESHOLDS: readonly { pages: number; level: number }[] = [
    { pages: 71, level: 4 },
    { pages: 41, level: 3 },
    { pages: 21, level: 2 },
    { pages: 1, level: 1 },
];
const AVERAGE_DECIMALS = 1;

/** StatsService::heatLevel: the same scale for the sidebar map and the statistics. */
export function heatLevel(pages: number): number {
    return (
        LEVEL_THRESHOLDS.find((threshold) => pages >= threshold.pages)?.level ??
        0
    );
}

function allSessions(model: ReadModel): readonly ReadingSessionRow[] {
    return model.state.tables.reading_sessions;
}

/** Pages per calendar day between two days, both included. */
export function pagesByDay(
    model: ReadModel,
    from: string,
    to: string,
): Map<string, number> {
    const pages = new Map<string, number>();

    for (const session of allSessions(model)) {
        const day = dayOf(session.read_on);

        if (day < from || day > to) {
            continue;
        }

        pages.set(day, (pages.get(day) ?? 0) + rawSessionPages(session));
    }

    return pages;
}

export function pagesOn(model: ReadModel, day: string): number {
    return pagesByDay(model, day, day).get(day) ?? 0;
}

/** Average pages on the days with reading; null before the first session. */
export function averagePagesPerReadingDay(model: ReadModel): number | null {
    const days = uniqueDays(allSessions(model)).length;

    if (days === 0) {
        return null;
    }

    const pages = allSessions(model).reduce(
        (sum, session) => sum + rawSessionPages(session),
        0,
    );

    return phpRound(pages / days, AVERAGE_DECIMALS);
}

/** Days with at least one session, in ascending order. */
function daysWithSessions(model: ReadModel): string[] {
    return uniqueDays(allSessions(model)).sort();
}

/** Heat levels for the last seven days, oldest first, ending today. */
export function lastWeekLevels(model: ReadModel): number[] {
    const first = addDays(model.today, 1 - WEEK_LENGTH);
    const pages = pagesByDay(model, first, model.today);
    const days = Array.from({ length: WEEK_LENGTH }, (_, index) =>
        addDays(first, index),
    );

    return days.map((day) => heatLevel(pages.get(day) ?? 0));
}

/**
 * Consecutive days with reading. Without a session today, the run still counts from
 * yesterday: it ends only once a whole day passes without reading.
 */
export function streakLength(days: readonly string[], today: string): number {
    const readDays = new Set(days);
    let cursor = readDays.has(today) ? today : addDays(today, -1);
    let length = 0;

    while (readDays.has(cursor)) {
        length++;
        cursor = addDays(cursor, -1);
    }

    return length;
}

export function streak(model: ReadModel): number {
    return streakLength(daysWithSessions(model), model.today);
}
