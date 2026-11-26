import type { CalendarDay, Forecast, Indicators, Streak } from '@/types';
import { addDays } from '../state/dates';
import { yearOf } from '../support/day';
import { phpRound } from '../support/php-round';
import { heatLevel, streakLength } from './activity';
import { bookOf } from './books';
import { yearGoal } from './dashboard';
import type { ReadModel } from './read-model';
import { sessionsOf } from './readings';
import {
    type ConcludedReading,
    type ConcludedSpan,
    concludedReadings,
    rereadsIn,
    spanDays,
} from './stats-books';
import {
    daysInPeriodYear,
    elapsedDays,
    enumerateDays,
    type StatsPeriod,
} from './stats-period';
import {
    readingDaysIn,
    sessionPages,
    sessionPagesByDay,
} from './stats-sessions';

const RATIO_DECIMALS = 1;
const SPAN_OFFSET_DAYS = 1;

function ratio(total: number, days: number): number | null {
    return days > 0 ? phpRound(total / days, RATIO_DECIMALS) : null;
}

/** Books finished without any session have no progress record, so their total pages count. */
function pagesWithoutSessions(
    model: ReadModel,
    readings: readonly ConcludedReading[],
): number {
    return readings
        .filter((reading) => sessionsOf(model, reading.id).length === 0)
        .reduce(
            (sum, reading) => sum + (bookOf(model, reading.book_id).pages ?? 0),
            0,
        );
}

function spanInDays(reading: ConcludedSpan): number {
    return spanDays(reading.started_at, reading.finished_at) + SPAN_OFFSET_DAYS;
}

function averageDaysPerBook(
    readings: readonly ConcludedReading[],
): number | null {
    const spanned = readings.filter(
        (reading): reading is ConcludedSpan => reading.started_at !== null,
    );

    if (spanned.length === 0) {
        return null;
    }

    const total = spanned.reduce(
        (sum, reading) => sum + spanInDays(reading),
        0,
    );

    return phpRound(total / spanned.length, RATIO_DECIMALS);
}

/** Period indicators: pages per day use the elapsed days, the average per reading day only the days with a session. */
export function indicators(model: ReadModel, period: StatsPeriod): Indicators {
    const concluded = concludedReadings(model, period);
    const sessionTotal = sessionPages(model, period);
    const pages = sessionTotal + pagesWithoutSessions(model, concluded);
    const readingDays = readingDaysIn(model, period).length;

    return {
        books_read: concluded.length,
        rereads: rereadsIn(model, period).length,
        pages_read: pages,
        pages_per_day: ratio(pages, elapsedDays(period)),
        pages_per_reading_day: ratio(sessionTotal, readingDays),
        reading_days: readingDays,
        days_per_book: averageDaysPerBook(concluded),
    };
}

/** Length of the longest run of consecutive days in a sorted list. */
function longestRun(days: readonly string[]): number {
    let longest = 0;
    let run = 0;
    let previous: string | null = null;

    for (const day of days) {
        run = previous !== null && addDays(previous, 1) === day ? run + 1 : 1;
        longest = Math.max(longest, run);
        previous = day;
    }

    return longest;
}

export function streaks(model: ReadModel, period: StatsPeriod): Streak {
    const days = readingDaysIn(model, period);

    return {
        current: streakLength(days, period.lastDay),
        longest: longestRun(days),
    };
}

/** Pages per day for each day of the period, with its color level (0 = no reading). */
export function heatmap(model: ReadModel, period: StatsPeriod): CalendarDay[] {
    const pages = sessionPagesByDay(model, period);

    return enumerateDays(period.start, period.end).map((date) => {
        const count = pages.get(date) ?? 0;

        return { date, pages: count, level: heatLevel(count) };
    });
}

/** Linear projection for the year; only for the current year, never the history. */
export function forecast(
    model: ReadModel,
    period: StatsPeriod,
): Forecast | null {
    if (period.history || yearOf(period.start) !== yearOf(model.today)) {
        return null;
    }

    const books = concludedReadings(model, period).length;
    const projection = (books / elapsedDays(period)) * daysInPeriodYear(period);

    return {
        projection: phpRound(projection),
        goal: yearGoal(model).goal,
        books,
    };
}
