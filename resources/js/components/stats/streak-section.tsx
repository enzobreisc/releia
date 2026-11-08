import { HeatMap } from '@/components/heat-map';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import type { CalendarDay, Streak } from '@/types';
import { StatsCard } from '@/components/stats/stats-card';

export function StreakSection({
    streak,
    calendar,
}: {
    streak: Streak;
    calendar: CalendarDay[];
}) {
    const { t, plural } = useTranslation();

    return (
        <StatsCard>
            <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                <SectionTitle>{t('dias em que você leu')}</SectionTitle>
                <span className="text-[13px] font-semibold text-muted">
                    {t('Maior sequência:')}{' '}
                    <span className="text-text">
                        {plural(streak.longest, 'dia', 'dias')}
                    </span>{' '}
                    · {t('Sequência atual:')}{' '}
                    <span className="text-text">{streak.current}</span>
                </span>
            </div>
            <HeatMap days={calendar} showLegend />
        </StatsCard>
    );
}
