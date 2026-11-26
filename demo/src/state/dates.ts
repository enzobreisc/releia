const MILLISECONDS_PER_DAY = 86_400_000;
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(.*)$/;
const CLOCK_DIGITS = 2;

/** Local calendar day, so the demo's "today" is the visitor's day, not UTC's. */
export function localIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

/** The export's timestamps: the local "YYYY-MM-DD HH:MM:SS". */
export function localDateTime(now: Date): string {
    const clock = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((part) => String(part).padStart(CLOCK_DIGITS, '0'))
        .join(':');

    return `${localIsoDate(now)} ${clock}`;
}

export function addDays(isoDate: string, days: number): string {
    const time =
        Date.parse(`${isoDate}T00:00:00Z`) + days * MILLISECONDS_PER_DAY;

    return new Date(time).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
    const difference =
        Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);

    return Math.round(difference / MILLISECONDS_PER_DAY);
}

/** Moves the date part of "2026-10-14" or "2026-10-14 21:41:05" and keeps the time. */
export function shiftTemporal(value: string, days: number): string {
    const match = DATE_PREFIX.exec(value);

    if (match === null) {
        return value;
    }

    const [, date, rest] = match;

    return `${addDays(date, days)}${rest}`;
}
