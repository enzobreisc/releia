import { cardClass } from '@/components/card';
import { TodayProgress } from '@/components/today-progress';
import { WeekSquares } from '@/components/week-squares';
import { useTranslation } from '@/hooks/use-translation';
import type { HomeToday } from '@/types';

export function TodayCard({ today }: { today: HomeToday }) {
    const { t, plural } = useTranslation();

    return (
        <section
            aria-labelledby="today-title"
            className={cardClass(
                'flex min-w-0 flex-[1_1_260px] flex-col gap-3 p-4.5',
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="today-title" className="text-xs font-bold text-muted">
                    {t('Hoje')}
                </h2>
                <span className="font-mono text-xs text-muted">
                    {t('sequência')} {plural(today.streak, 'dia', 'dias')}
                </span>
            </div>
            <p className="flex items-baseline gap-1.5">
                <span className="text-4xl leading-none font-extrabold tracking-tight">
                    {today.pages}
                </span>
                <span className="text-[15px] font-semibold text-muted">
                    {t('págs')}
                </span>
            </p>
            <TodayProgress
                pagesToday={today.pages}
                averagePages={today.average}
                dailyGoal={today.goal}
            />
            <WeekSquares week={today.week} />
        </section>
    );
}
