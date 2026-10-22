/** Local date for today as "2026-10-15" (not UTC: at night UTC is already tomorrow). */
export function today(offsetDays = 0): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}
