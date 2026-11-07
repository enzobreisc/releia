const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

const twoDigits = (value: number) => String(value).padStart(2, '0');

/** "23:41" and, past the first hour, "1:02:09". */
export function formatStopwatch(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / (SECONDS_PER_MINUTE * 60));
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE) % 60;
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    const clock = `${twoDigits(minutes)}:${twoDigits(seconds)}`;

    return hours > 0 ? `${hours}:${clock}` : clock;
}

/** Whole minutes needed to read `pagesLeft` pages at `pagesPerHour`. */
export function minutesToRead(pagesLeft: number, pagesPerHour: number): number {
    return Math.ceil((pagesLeft / pagesPerHour) * MINUTES_PER_HOUR);
}

export function splitMinutes(minutes: number) {
    return {
        hours: Math.floor(minutes / MINUTES_PER_HOUR),
        minutes: minutes % MINUTES_PER_HOUR,
    };
}
