import type { ReadingSessionRow } from '../state/types';
import { compareText } from '../support/collections';
import { dayOf } from '../support/day';
import type { ReadModel } from './read-model';
import { containsDay, type StatsPeriod } from './stats-period';
import { rawSessionPages, uniqueDays } from './readings';

/** Pages of one session, never negative: MAX(page_to - page_from + 1, 0). */
export function sessionPagesOf(session: ReadingSessionRow): number {
    return Math.max(0, rawSessionPages(session));
}

function sessionsIn(
    model: ReadModel,
    period: StatsPeriod,
): ReadingSessionRow[] {
    return model.state.tables.reading_sessions.filter((session) =>
        containsDay(period, dayOf(session.read_on)),
    );
}

export function sessionPages(model: ReadModel, period: StatsPeriod): number {
    return sessionsIn(model, period).reduce(
        (sum, session) => sum + sessionPagesOf(session),
        0,
    );
}

/** Pages per day for the days with a session in the period. */
export function sessionPagesByDay(
    model: ReadModel,
    period: StatsPeriod,
): Map<string, number> {
    const pages = new Map<string, number>();

    for (const session of sessionsIn(model, period)) {
        const day = dayOf(session.read_on);

        pages.set(day, (pages.get(day) ?? 0) + sessionPagesOf(session));
    }

    return pages;
}

export function readingDaysIn(model: ReadModel, period: StatsPeriod): string[] {
    return uniqueDays(sessionsIn(model, period)).sort(compareText);
}
