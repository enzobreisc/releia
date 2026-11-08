import { useTranslation } from '@/hooks/use-translation';
import type { MonthlyBar } from '@/types';

const MIN_MAX_COUNT = 1;

export function useMonthlyChart(bars: MonthlyBar[]) {
    const { t, plural } = useTranslation();
    const total = bars.reduce((sum, bar) => sum + bar.count, 0);

    return {
        totalLabel: plural(total, 'livro', 'livros'),
        max: Math.max(MIN_MAX_COUNT, ...bars.map((bar) => bar.count)),
        ariaLabel: `${t('livros por mês')}: ${bars
            .map((bar) => `${bar.label} ${bar.count}`)
            .join(', ')}`,
    };
}
