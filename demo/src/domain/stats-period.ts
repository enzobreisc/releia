import { addDays, daysBetween } from '../state/dates';
import { dayOf, daysInYear, yearOf } from '../support/day';
import { intCast } from '../support/php-cast';
import type { ReadModel } from './read-model';

const CALENDAR_LAST_DAYS = 365;

/** StatsPeriod: both ends included, as "YYYY-MM-DD" days. */
export type StatsPeriod = {
    readonly start: string;
    readonly end: string;
    /** The last day that has already happened: future days have no pace. */
    readonly lastDay: string;
    readonly history: boolean;
};

function periodOf(
    start: string,
    end: string,
    today: string,
    history: boolean,
): StatsPeriod {
    return {
        start,
        end,
        lastDay: end > today ? today : end,
        history,
    };
}

export function yearPeriod(year: number, today: string): StatsPeriod {
    return periodOf(`${year}-01-01`, `${year}-12-31`, today, false);
}

export function historyPeriod(since: string, today: string): StatsPeriod {
    return periodOf(dayOf(since), today, today, true);
}

export function lastDaysPeriod(days: number, today: string): StatsPeriod {
    return periodOf(addDays(today, 1 - days), today, today, false);
}

export function calendarPeriod(
    period: StatsPeriod,
    today: string,
): StatsPeriod {
    return period.history ? lastDaysPeriod(CALENDAR_LAST_DAYS, today) : period;
}

export function containsDay(period: StatsPeriod, day: string): boolean {
    return day >= period.start && day <= period.end;
}

export function elapsedDays(period: StatsPeriod): number {
    return period.lastDay < period.start
        ? 0
        : daysBetween(period.start, period.lastDay) + 1;
}

export function daysInPeriodYear(period: StatsPeriod): number {
    return daysInYear(yearOf(period.start));
}

/** Every day from `start` to `end`, both included. */
export function enumerateDays(start: string, end: string): string[] {
    const days: string[] = [];

    for (let day = start; day <= end; day = addDays(day, 1)) {
        days.push(day);
    }

    return days;
}

function earliest(values: readonly string[]): string | null {
    return values.length === 0
        ? null
        : values.reduce((first, value) => (value < first ? value : first));
}

/** The first day with any reading or session; today when there is none. */
export function firstActivityDay(model: ReadModel): string {
    const { readings, reading_sessions: sessions } = model.state.tables;
    const dates = [
        ...readings.flatMap((reading) => [
            reading.started_at,
            reading.finished_at,
        ]),
        ...sessions.map((session) => session.read_on),
    ].filter((value): value is string => value !== null && value !== '');
    const first = earliest(dates);

    return first === null ? model.today : dayOf(first);
}

/** StatsService::years: every year from the first activity to this one, newest first. */
export function yearsWithActivity(model: ReadModel): number[] {
    const currentYear = yearOf(model.today);
    const firstYear = Math.min(yearOf(firstActivityDay(model)), currentYear);
    const years: number[] = [];

    for (let year = currentYear; year >= firstYear; year--) {
        years.push(year);
    }

    return years;
}

/**
 * The year a request asked for when it has activity, otherwise the fallback year, which
 * is always one of the listed years.
 */
export function pickYear(
    requested: string | null,
    years: readonly number[],
    fallbackYear: number,
): number {
    const candidate = intCast(requested ?? '');

    return years.includes(candidate) ? candidate : fallbackYear;
}
