import type { ReadingRow, ReadingSessionRow } from '../state/types';
import { dayOf, inclusiveDays } from '../support/day';
import { phpRound } from '../support/php-round';
import { bookOf } from './books';
import type { ReadModel } from './read-model';
import { rawSessionPages, sessionsOf, uniqueDays } from './readings';

const PERCENT = 100;
const PACE_DECIMALS = 1;
const HOURS_PER_MINUTE_FACTOR = 60;

export type ReadingProgressValues = {
    current_page: number;
    pages: number | null;
    percent: number | null;
    pace: number | null;
    days_left: number | null;
    finish_suggested: boolean;
};

type SessionTotals = { days: number; pages: number };

function totalsOf(sessions: readonly ReadingSessionRow[]): SessionTotals {
    return {
        days: uniqueDays(sessions).length,
        pages: sessions.reduce(
            (sum, session) => sum + rawSessionPages(session),
            0,
        ),
    };
}

function percentOf(current: number, pages: number | null): number | null {
    if (pages === null || pages <= 0) {
        return null;
    }

    return Math.min(PERCENT, phpRound((current / pages) * PERCENT));
}

function daysLeftOf(
    remaining: number | null,
    pace: number | null,
): number | null {
    if (remaining === null || remaining <= 0 || pace === null || pace <= 0) {
        return null;
    }

    return Math.ceil(remaining / pace);
}

/**
 * ReadingService::progress: pace is pages per day counted over the days with reading,
 * the same criterion as the statistics. Without sessions there is no forecast.
 */
export function readingProgress(
    model: ReadModel,
    reading: ReadingRow,
): ReadingProgressValues {
    const { pages } = bookOf(model, reading.book_id);
    const totals = totalsOf(sessionsOf(model, reading.id));
    const rawPace = totals.days > 0 ? totals.pages / totals.days : null;
    const remaining = pages === null ? null : pages - reading.current_page;

    return {
        current_page: reading.current_page,
        pages,
        percent: percentOf(reading.current_page, pages),
        pace: rawPace === null ? null : phpRound(rawPace, PACE_DECIMALS),
        days_left: daysLeftOf(remaining, rawPace),
        finish_suggested:
            reading.status === 'reading' &&
            pages !== null &&
            reading.current_page >= pages,
    };
}

/** ReadingService::pagesPerHour over the timed sessions; null while none has minutes. */
export function pagesPerHour(
    model: ReadModel,
    reading: ReadingRow,
): number | null {
    const timed = sessionsOf(model, reading.id).filter(
        (session) => session.minutes !== null,
    );
    const pages = timed.reduce(
        (sum, session) => sum + rawSessionPages(session),
        0,
    );
    const minutes = timed.reduce(
        (sum, session) => sum + (session.minutes ?? 0),
        0,
    );

    if (minutes <= 0) {
        return null;
    }

    return phpRound((pages / minutes) * HOURS_PER_MINUTE_FACTOR, PACE_DECIMALS);
}

/** Whole days from the reading's start to its end, both included. */
export function readingSpanDays(reading: ReadingRow): number | null {
    if (reading.started_at === null || reading.finished_at === null) {
        return null;
    }

    return inclusiveDays(dayOf(reading.started_at), dayOf(reading.finished_at));
}
