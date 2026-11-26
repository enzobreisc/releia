import type { Locale } from '@/lib/i18n';

const FULL_MONTH_NAMES: Record<Locale, readonly string[]> = {
    pt_BR: [
        'janeiro',
        'fevereiro',
        'março',
        'abril',
        'maio',
        'junho',
        'julho',
        'agosto',
        'setembro',
        'outubro',
        'novembro',
        'dezembro',
    ],
    en: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ],
};

const MONTH_START = 5;
const MONTH_END = 7;

/** The month number of a "YYYY-MM" key. */
export function monthNumberOf(yearMonth: string): number {
    return Number(yearMonth.slice(MONTH_START, MONTH_END));
}

/** Carbon's full month name ("junho", "June"), as DateLabel::monthName gives it. */
export function monthFullName(locale: Locale, month: number): string {
    return FULL_MONTH_NAMES[locale][month - 1];
}
