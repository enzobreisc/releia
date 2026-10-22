import { usePage } from '@inertiajs/react';
import {
    formatBRL,
    fullDate,
    longDate,
    monthYear,
    ordinal,
    plural,
    shortDate,
    translate,
    translateText,
} from '@/lib/i18n';
import type { Replacements, TranslationKey } from '@/lib/i18n';

export function useTranslation() {
    const { locale, language_tag: languageTag } = usePage().props;

    return {
        locale,
        languageTag,
        t: (key: TranslationKey, replacements?: Replacements) =>
            translate(locale, key, replacements),
        translateText: (text: string) => translateText(locale, text),
        ordinal: (number: number, gender?: 'masculine' | 'feminine') =>
            ordinal(locale, number, gender),
        plural: (count: number, one: TranslationKey, many: TranslationKey) =>
            plural(locale, count, one, many),
        shortDate: (date: string) => shortDate(locale, date),
        monthYear: (date: string) => monthYear(locale, date),
        fullDate: (date: string) => fullDate(locale, date),
        longDate: (date: string) => longDate(locale, date),
        formatBRL: (cents: number) => formatBRL(languageTag, cents),
    };
}
