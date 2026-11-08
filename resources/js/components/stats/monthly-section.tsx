import { SectionTitle } from '@/components/page-header';
import { useMonthlyChart } from '@/hooks/use-monthly-chart';
import { useTranslation } from '@/hooks/use-translation';
import type { MonthlyBar } from '@/types';
import { MonthlyChart } from '@/components/stats/monthly-chart';
import { StatsCard } from '@/components/stats/stats-card';

export function MonthlySection({ bars }: { bars: MonthlyBar[] }) {
    const { t } = useTranslation();
    const { totalLabel, max, ariaLabel } = useMonthlyChart(bars);

    return (
        <StatsCard>
            <div className="flex items-baseline justify-between">
                <SectionTitle>{t('livros por mês')}</SectionTitle>
                <span className="font-mono text-xs text-muted">
                    {totalLabel}
                </span>
            </div>
            <MonthlyChart bars={bars} max={max} ariaLabel={ariaLabel} />
        </StatsCard>
    );
}
