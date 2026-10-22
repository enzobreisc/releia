import en from '../../../lang/en.json';

export type Locale = 'pt_BR' | 'en';

export type TranslationKey = keyof typeof en;

export type Replacements = Record<string, string | number>;

const ENGLISH_MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

const PORTUGUESE_MONTHS = [
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

const dictionaries: Record<Locale, Record<string, string>> = {
    pt_BR: {},
    en,
};

function fillReplacements(text: string, replacements?: Replacements): string {
    if (replacements === undefined) {
        return text;
    }

    return text.replace(/:(\w+)/g, (match, name: string) =>
        name in replacements ? String(replacements[name]) : match,
    );
}

/** Portuguese is the source language: its keys are the text itself. */
export function translateText(
    locale: Locale,
    text: string,
    replacements?: Replacements,
): string {
    return fillReplacements(dictionaries[locale][text] ?? text, replacements);
}

export function translate(
    locale: Locale,
    key: TranslationKey,
    replacements?: Replacements,
): string {
    return translateText(locale, key, replacements);
}

export function plural(
    locale: Locale,
    count: number,
    one: TranslationKey,
    many: TranslationKey,
): string {
    return `${count} ${translate(locale, count === 1 ? one : many)}`;
}

/** "2º" or "2ª" (pt-BR, by grammatical gender) or "2nd" (en). */
export function ordinal(
    locale: Locale,
    number: number,
    gender: 'masculine' | 'feminine' = 'masculine',
): string {
    if (locale !== 'en') {
        return `${number}${gender === 'feminine' ? 'ª' : 'º'}`;
    }

    const lastTwoDigits = number % 100;
    const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
    const suffix =
        lastTwoDigits >= 11 && lastTwoDigits <= 13
            ? 'th'
            : (suffixes[number % 10] ?? 'th');

    return `${number}${suffix}`;
}

function monthNames(locale: Locale): string[] {
    return locale === 'en' ? ENGLISH_MONTHS : PORTUGUESE_MONTHS;
}

/** "2026-10-14" becomes "14 out" (pt-BR) or "Oct 14" (en). */
export function shortDate(locale: Locale, date: string): string {
    const [, month, day] = date.split('-');
    const name = monthNames(locale)[Number(month) - 1];

    return locale === 'en'
        ? `${name} ${Number(day)}`
        : `${Number(day)} ${name}`;
}

/** "2026-10-14" becomes "14 out 2026" (pt-BR) or "Oct 14, 2026" (en). */
export function fullDate(locale: Locale, date: string): string {
    const [year] = date.split('-');

    return locale === 'en'
        ? `${shortDate(locale, date)}, ${year}`
        : `${shortDate(locale, date)} ${year}`;
}

/** "2026-10-14" becomes "out 2026" (pt-BR) or "Oct 2026" (en). */
export function monthYear(locale: Locale, date: string): string {
    const [year, month] = date.split('-');

    return `${monthNames(locale)[Number(month) - 1]} ${year}`;
}

/** "2026-10-14" becomes "14/10/2026" (pt-BR) or "10/14/2026" (en). */
export function longDate(locale: Locale, date: string): string {
    const [year, month, day] = date.split('-');

    return locale === 'en'
        ? `${month}/${day}/${year}`
        : `${day}/${month}/${year}`;
}

/** Whole cents to reais for display: "R$ 34,90" (pt-BR) or "R$ 34.90" (en). */
export function formatBRL(languageTag: string, cents: number): string {
    return new Intl.NumberFormat(languageTag, {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
}
