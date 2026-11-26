import type { BookRow, ReadingRow } from '../state/types';
import { dayOf, daysInYear, dayOfYear, yearOf } from '../support/day';
import { compareText } from '../support/collections';
import { phpRound } from '../support/php-round';
import { bookOf } from './books';
import type { ReadModel } from './read-model';
import { sessionsOf } from './readings';
import { readIntegerSetting } from './settings';

const RECENT_LIMIT = 8;
const DAILY_GOAL_SETTING = 'daily_goal';
const YEARLY_GOAL_SETTING = 'yearly_goal';

export type YearGoalValues = {
    year: number;
    goal: number | null;
    finished: number;
    projected: number;
};

type RecentFinish = { reading: ReadingRow; book: BookRow };

function latestSessionId(model: ReadModel, readingId: number): number | null {
    const ids = sessionsOf(model, readingId).map((session) => session.id);

    return ids.length === 0 ? null : Math.max(...ids);
}

function currentReadings(
    model: ReadModel,
    status: ReadingRow['status'],
): ReadingRow[] {
    return [...model.currentReadingByBook.values()].filter(
        (reading) => reading.status === status,
    );
}

/**
 * DashboardService::readingsInProgress: current readings being read, ordered by the
 * latest logged session; a reading with no session goes last, then the newest id.
 */
export function readingsInProgress(model: ReadModel): ReadingRow[] {
    return currentReadings(model, 'reading')
        .map((reading) => ({
            reading,
            session: latestSessionId(model, reading.id),
        }))
        .sort(
            (left, right) =>
                Number(left.session === null) -
                    Number(right.session === null) ||
                (right.session ?? 0) - (left.session ?? 0) ||
                right.reading.id - left.reading.id,
        )
        .map(({ reading }) => reading);
}

/** Rereads count too: every reading finished in the year is a finished book. */
export function yearGoal(model: ReadModel): YearGoalValues {
    const year = yearOf(model.today);
    const finished = model.state.tables.readings.filter(
        (reading) =>
            reading.status === 'read' &&
            reading.finished_at !== null &&
            yearOf(dayOf(reading.finished_at)) === year,
    ).length;
    const daysPassed = dayOfYear(model.today);

    return {
        year,
        goal: readIntegerSetting(model, YEARLY_GOAL_SETTING),
        finished,
        projected: phpRound((finished / daysPassed) * daysInYear(year)),
    };
}

export function dailyGoal(model: ReadModel): number | null {
    return readIntegerSetting(model, DAILY_GOAL_SETTING);
}

/** Newest finish first. A reading without a finish date sorts last. */
export function recentlyFinished(
    model: ReadModel,
    limit = RECENT_LIMIT,
): RecentFinish[] {
    return currentReadings(model, 'read')
        .sort((left, right) => {
            const byFinish = compareText(finishDayOf(right), finishDayOf(left));

            return byFinish || left.id - right.id;
        })
        .slice(0, limit)
        .map((reading) => ({
            reading,
            book: bookOf(model, reading.book_id),
        }));
}

function finishDayOf(reading: ReadingRow): string {
    return reading.finished_at === null ? '' : dayOf(reading.finished_at);
}
