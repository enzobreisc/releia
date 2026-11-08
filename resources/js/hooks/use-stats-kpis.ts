import { useTranslation } from '@/hooks/use-translation';
import type { Indicators } from '@/types';
import { EMPTY_VALUE } from '@/lib/format';

export type StatKpi = {
    label: string;
    value: string;
    note?: string;
};

const WHOLE_NUMBER_DIGITS = 0;
const ONE_DECIMAL_DIGITS = 1;

function formatNumber(
    languageTag: string,
    value: number | null,
    digits = WHOLE_NUMBER_DIGITS,
) {
    return value === null
        ? EMPTY_VALUE
        : value.toLocaleString(languageTag, {
              maximumFractionDigits: digits,
          });
}

export function useStatsKpis(indicators: Indicators): StatKpi[] {
    const { t, plural, languageTag } = useTranslation();

    return [
        {
            label: t('livros lidos'),
            value: formatNumber(languageTag, indicators.books_read),
            note:
                indicators.rereads > 0
                    ? t('inclui :rereads', {
                          rereads: plural(
                              indicators.rereads,
                              'releitura',
                              'releituras',
                          ),
                      })
                    : undefined,
        },
        {
            label: t('páginas lidas'),
            value: formatNumber(languageTag, indicators.pages_read),
        },
        {
            label: t('páginas por dia'),
            value: formatNumber(
                languageTag,
                indicators.pages_per_day,
                ONE_DECIMAL_DIGITS,
            ),
            note: t(':pages nos dias com leitura', {
                pages: formatNumber(
                    languageTag,
                    indicators.pages_per_reading_day,
                    ONE_DECIMAL_DIGITS,
                ),
            }),
        },
        {
            label: t('dias por livro'),
            value: formatNumber(
                languageTag,
                indicators.days_per_book,
                ONE_DECIMAL_DIGITS,
            ),
        },
    ];
}
