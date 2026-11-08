import { PageHeader } from '@/components/page-header';
import { BestMonth } from '@/components/stats/best-month-card';
import { ForecastBanner } from '@/components/stats/forecast-banner';
import { HighlightsSection } from '@/components/stats/highlights-section';
import { KpiGrid } from '@/components/stats/kpi-grid';
import { MonthlySection } from '@/components/stats/monthly-section';
import { PeriodSelector } from '@/components/stats/period-selector';
import { RankingCard } from '@/components/stats/ranking-card';
import { StreakSection } from '@/components/stats/streak-section';
import { useTranslation } from '@/hooks/use-translation';
import type {
    CalendarDay,
    Forecast as ForecastData,
    Indicators,
    MonthlyBar,
    NamedCount,
    ReadingRef,
    Streak,
} from '@/types';

type StatsProps = {
    selected: string;
    years: number[];
    indicators: Indicators;
    monthly: MonthlyBar[];
    genres: NamedCount[];
    authors: NamedCount[];
    extremes: {
        fastest: ReadingRef | null;
        longest: ReadingRef | null;
    };
    best_month: BestMonth | null;
    streak: Streak;
    calendar: CalendarDay[];
    forecast: ForecastData | null;
};

const GENRE_LABEL_WIDTH = '110px';
const AUTHOR_LABEL_WIDTH = '150px';

export default function Stats({
    selected,
    years,
    indicators,
    monthly,
    genres,
    authors,
    extremes,
    best_month,
    streak,
    calendar,
    forecast,
}: StatsProps) {
    const { t } = useTranslation();

    return (
        <>
            <PageHeader
                title={t('Estatísticas')}
                actions={<PeriodSelector years={years} selected={selected} />}
            />

            <KpiGrid indicators={indicators} />

            {forecast && <ForecastBanner forecast={forecast} />}

            <MonthlySection bars={monthly} />

            <div className="flex flex-wrap gap-3.5">
                <RankingCard
                    title={t('gêneros mais lidos')}
                    items={genres}
                    labelWidth={GENRE_LABEL_WIDTH}
                    translateLabels
                />
                <RankingCard
                    title={t('autores mais lidos')}
                    items={authors}
                    labelWidth={AUTHOR_LABEL_WIDTH}
                />
            </div>

            <HighlightsSection extremes={extremes} bestMonth={best_month} />

            <StreakSection streak={streak} calendar={calendar} />
        </>
    );
}
