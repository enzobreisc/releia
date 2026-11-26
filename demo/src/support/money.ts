import type { Locale } from '@/lib/i18n';

const CENTS_PER_UNIT = 100;
const CURRENCY_PREFIX = 'R$ ';
const THOUSANDS_PATTERN = /\B(?=(\d{3})+(?!\d))/g;

type Separators = { decimal: string; thousands: string };

function separatorsFor(locale: Locale): Separators {
    return locale === 'en'
        ? { decimal: '.', thousands: ',' }
        : { decimal: ',', thousands: '.' };
}

/** Money::format: "R$ 34,90" in pt-BR and "R$ 34.90" in English, built from whole cents. */
export function formatMoney(cents: number, locale: Locale): string {
    const { decimal, thousands } = separatorsFor(locale);
    const sign = cents < 0 ? '-' : '';
    const magnitude = Math.abs(cents);
    const units = Math.floor(magnitude / CENTS_PER_UNIT)
        .toString()
        .replace(THOUSANDS_PATTERN, thousands);
    const fraction = String(magnitude % CENTS_PER_UNIT).padStart(2, '0');

    return `${sign}${CURRENCY_PREFIX}${units}${decimal}${fraction}`;
}
