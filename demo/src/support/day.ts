import { daysBetween } from '../state/dates';

const DAY_LENGTH = 10;
const FIRST_DAY_OF_YEAR = '01-01';
const DAYS_IN_LEAP_YEAR = 366;
const DAYS_IN_YEAR = 365;
const LEAP_CENTURY = 400;

/** Date columns hold "2026-10-14 00:00:00" in the export; only the calendar day is compared. */
export function dayOf(value: string): string {
    return value.slice(0, DAY_LENGTH);
}

export function nullableDayOf(value: string | null): string | null {
    return value === null ? null : dayOf(value);
}

export function yearOf(day: string): number {
    return Number(day.slice(0, 4));
}

function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % LEAP_CENTURY === 0;
}

export function daysInYear(year: number): number {
    return isLeapYear(year) ? DAYS_IN_LEAP_YEAR : DAYS_IN_YEAR;
}

export function dayOfYear(day: string): number {
    return daysBetween(`${yearOf(day)}-${FIRST_DAY_OF_YEAR}`, day) + 1;
}

/** Inclusive span of whole days, as ReadingService::finish and the statistics count them. */
export function inclusiveDays(from: string, to: string): number {
    return daysBetween(from, to) + 1;
}
