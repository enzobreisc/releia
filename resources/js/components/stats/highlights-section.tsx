import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import type { ReadingRef } from '@/types';
import {
    type BestMonth,
    BestMonthCard,
} from '@/components/stats/best-month-card';
import { HighlightBook } from '@/components/stats/highlight-book';

export function HighlightsSection({
    extremes,
    bestMonth,
}: {
    extremes: {
        fastest: ReadingRef | null;
        longest: ReadingRef | null;
    };
    bestMonth: BestMonth | null;
}) {
    const { t } = useTranslation();

    return (
        <section className="flex flex-col gap-3.5">
            <SectionTitle>{t('destaques')}</SectionTitle>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3.5">
                <HighlightBook
                    label={t('mais rápido')}
                    reading={extremes.fastest}
                />
                <HighlightBook
                    label={t('mais longo')}
                    reading={extremes.longest}
                />
                <BestMonthCard bestMonth={bestMonth} />
            </div>
        </section>
    );
}
