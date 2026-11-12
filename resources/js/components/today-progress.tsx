import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type TodayProgressProps = {
    pagesToday: number;
    averagePages: number | null;
    /** When set, the goal replaces the average as the mark to reach. */
    dailyGoal: number | null;
};

/** Room above the larger of today's pages and the mark, so the bar never fills up. */
const BAR_HEADROOM = 1.25;

export function TodayProgress({
    pagesToday,
    averagePages,
    dailyGoal,
}: TodayProgressProps) {
    const { t } = useTranslation();
    const referencePages = dailyGoal ?? averagePages;

    if (referencePages === null) {
        return null;
    }

    const isGoalReached = dailyGoal !== null && pagesToday >= dailyGoal;
    const barScale = Math.max(pagesToday, referencePages) * BAR_HEADROOM;

    function percentOfBar(pages: number) {
        return barScale === 0 ? 0 : (pages / barScale) * 100;
    }

    function averageComparison(average: number) {
        const difference = pagesToday - Math.round(average);

        if (difference === 0) {
            return t('na média');
        }

        return difference > 0
            ? t(':pages acima da média', { pages: difference })
            : t(':pages abaixo da média', { pages: -difference });
    }

    function goalComparison(goal: number) {
        if (pagesToday < goal) {
            return t('faltam :pages págs para a meta', {
                pages: goal - pagesToday,
            });
        }

        return pagesToday === goal
            ? t('meta batida')
            : t('meta batida, :pages acima', { pages: pagesToday - goal });
    }

    return (
        <>
            <div className="relative mt-1 h-1.5 rounded-full bg-border">
                <span
                    className={cn(
                        'absolute inset-y-0 left-0 rounded-full',
                        isGoalReached ? 'bg-link' : 'bg-accent',
                    )}
                    style={{ width: `${percentOfBar(pagesToday)}%` }}
                />
                <span
                    aria-hidden="true"
                    className="absolute -inset-y-1 w-0.5 bg-text"
                    style={{ left: `${percentOfBar(referencePages)}%` }}
                />
            </div>
            <div className="flex justify-between gap-3">
                <span
                    className={cn(
                        'text-[13px] font-semibold text-secondary',
                        isGoalReached && 'text-link',
                    )}
                >
                    {dailyGoal === null
                        ? averageComparison(referencePages)
                        : goalComparison(dailyGoal)}
                </span>
                <span className="font-mono text-xs text-muted">
                    {dailyGoal === null
                        ? t('média :average', {
                              average: Math.round(referencePages),
                          })
                        : t('meta :goal', { goal: dailyGoal })}
                </span>
            </div>
        </>
    );
}
