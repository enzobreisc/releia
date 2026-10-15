const MONTHS = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
];

/** Data local de hoje em "2026-10-15" (não UTC: à noite o UTC já é amanhã). */
export function today(offsetDays = 0): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

/** "2026-10-14" vira "14 out". */
export function shortDate(date: string): string {
    const [, month, day] = date.split('-');

    return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
}

/** "2026-10-14" vira "out 2026". */
export function monthYear(date: string): string {
    const [year, month] = date.split('-');

    return `${MONTHS[Number(month) - 1]} ${year}`;
}

export function plural(count: number, one: string, many: string): string {
    return `${count} ${count === 1 ? one : many}`;
}
