/** Days between two "YYYY-MM-DD" dates, counting both ends. */
export function daysBetween(start: string, end: string): number {
    const ms =
        new Date(`${end}T12:00:00`).getTime() -
        new Date(`${start}T12:00:00`).getTime();

    return Math.round(ms / 86_400_000) + 1;
}
