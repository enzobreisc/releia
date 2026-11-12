import { router } from '@inertiajs/react';
import { cardClass } from '@/components/card';
import { Segmented } from '@/components/form';
import { HeatMap } from '@/components/heat-map';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { show as profileShow } from '@/routes/profile';
import type { CalendarDay } from '@/types';

function selectYear(option: string) {
    router.get(
        profileShow.url(),
        { year: option },
        {
            only: ['year', 'calendar', 'year_summary'],
            preserveScroll: true,
            preserveState: true,
            replace: true,
        },
    );
}

export function ReadingCalendar({
    calendar,
    year,
    years,
    summary,
}: {
    calendar: CalendarDay[];
    year: number;
    years: number[];
    summary: { reading_days: number; longest_streak: number };
}) {
    const { t, plural } = useTranslation();

    return (
        <section
            aria-label={t('Calendário de leitura')}
            className={cardClass('flex flex-col gap-3.5 rounded-lg p-5.5')}
        >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
                <SectionTitle>{t('Calendário de leitura')}</SectionTitle>
                {years.length > 1 && (
                    <Segmented
                        options={years.map((option) => ({
                            value: String(option),
                            label: String(option),
                        }))}
                        value={String(year)}
                        onChange={selectYear}
                    />
                )}
            </div>
            <span className="text-[13px] font-semibold text-muted">
                {t(':days de leitura em :year', {
                    days: plural(summary.reading_days, 'dia', 'dias'),
                    year,
                })}{' '}
                · {t('maior sequência:')}{' '}
                <span className="text-text">
                    {plural(summary.longest_streak, 'dia', 'dias')}
                </span>
            </span>
            <HeatMap days={calendar} showLegend />
        </section>
    );
}
