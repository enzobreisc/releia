import type { ReactNode } from 'react';
import { heatClass } from '@/components/heat-map';
import { cardClass } from '@/components/card';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

type SessionStatsProps = {
    pagesToday: number;
    averagePages: number | null;
    dailyGoal: number | null;
    streak: number;
    week: number[];
    /** Null when the book has no page count. */
    pagesLeft: number | null;
    /** Reading time left at the reader's pace, if there is a pace to go by. */
    minutesLeft: number | null;
    daysLeft: number | null;
    finishTime: string | null;
};

/** Room above the larger of today's pages and the average, so the bar never fills up. */
const BAR_HEADROOM = 1.25;

const MINUTES_PER_HOUR = 60;

/** The day's numbers: pages today against the average, streak and what is left to finish. */
export function SessionStats({
    pagesToday,
    averagePages,
    dailyGoal,
    streak,
    week,
    pagesLeft,
    minutesLeft,
    daysLeft,
    finishTime,
}: SessionStatsProps) {
    const { t, plural, weekdayInitial } = useTranslation();

    const today = new Date();
    const referencePages = dailyGoal ?? averagePages;
    const isGoalReached = dailyGoal !== null && pagesToday >= dailyGoal;
    const barScale = Math.max(pagesToday, referencePages ?? 0) * BAR_HEADROOM;

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

    function duration(minutes: number) {
        const hours = Math.floor(minutes / MINUTES_PER_HOUR);

        return hours > 0
            ? t(':hours h :minutes min', {
                  hours,
                  minutes: minutes % MINUTES_PER_HOUR,
              })
            : t(':minutes min', { minutes });
    }

    function finishEstimate() {
        if (minutesLeft !== null) {
            return t('cerca de :duration no seu ritmo', {
                duration: duration(minutesLeft),
            });
        }

        return daysLeft === null
            ? null
            : t('faltam :duration no seu ritmo', {
                  duration: plural(daysLeft, 'dia', 'dias'),
              });
    }

    return (
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-4">
            <Stat
                label={t('Hoje')}
                value={t(':pages págs', { pages: pagesToday })}
            >
                {referencePages !== null && (
                    <>
                        <div className="relative mt-1 h-1.5 rounded-full bg-border">
                            <span
                                className={cn(
                                    'absolute inset-y-0 left-0 rounded-full',
                                    isGoalReached ? 'bg-link' : 'bg-accent',
                                )}
                                style={{
                                    width: `${percentOfBar(pagesToday)}%`,
                                }}
                            />
                            <span
                                aria-hidden="true"
                                className="absolute -inset-y-1 w-0.5 bg-text"
                                style={{
                                    left: `${percentOfBar(referencePages)}%`,
                                }}
                            />
                        </div>
                        <div className="flex justify-between gap-3">
                            <Detail
                                className={cn(isGoalReached && 'text-link')}
                            >
                                {dailyGoal === null
                                    ? averageComparison(referencePages)
                                    : goalComparison(dailyGoal)}
                            </Detail>
                            <span className="font-mono text-xs text-muted">
                                {dailyGoal === null
                                    ? t('média :average', {
                                          average: Math.round(referencePages),
                                      })
                                    : t('meta :goal', { goal: dailyGoal })}
                            </span>
                        </div>
                    </>
                )}
            </Stat>

            <Stat label={t('Sequência')} value={plural(streak, 'dia', 'dias')}>
                <span
                    role="img"
                    aria-label={t('Últimos 7 dias, hoje é o último')}
                    className="flex gap-1"
                >
                    {week.map((level, index) => {
                        const daysAgo = week.length - 1 - index;
                        const day = new Date(today);
                        day.setDate(today.getDate() - daysAgo);

                        return (
                            <span
                                key={index}
                                className="flex flex-col items-center gap-1.5"
                            >
                                <span
                                    className={cn(
                                        'size-5.5 rounded-[5px]',
                                        heatClass(level),
                                        daysAgo === 0 &&
                                            'outline outline-[1.5px] outline-offset-2 outline-link',
                                    )}
                                />
                                <span className="font-mono text-[10px] text-muted">
                                    {weekdayInitial(day)}
                                </span>
                            </span>
                        );
                    })}
                </span>
            </Stat>

            {pagesLeft !== null && (
                <Stat
                    label={t('Para terminar')}
                    value={
                        pagesLeft === 0
                            ? t('Você chegou à última página.')
                            : t(':pages págs', { pages: pagesLeft })
                    }
                    aside={
                        finishTime !== null && pagesLeft > 0 ? (
                            <>
                                <span className="text-xs font-bold text-muted">
                                    {t('termina às')}
                                </span>
                                <span className="font-mono text-[30px] leading-none font-medium text-link">
                                    {finishTime}
                                </span>
                            </>
                        ) : undefined
                    }
                >
                    {pagesLeft > 0 && <Detail>{finishEstimate()}</Detail>}
                </Stat>
            )}
        </dl>
    );
}

function Stat({
    label,
    value,
    aside,
    children,
}: {
    label: string;
    value: string;
    aside?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className={cardClass('flex flex-col gap-3.5 px-5.5 py-5')}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                    <dt className="text-xs font-bold text-muted">{label}</dt>
                    <dd className="text-[30px] leading-none font-extrabold tracking-tight">
                        {value}
                    </dd>
                </div>
                {aside && (
                    <div className="flex flex-col items-end gap-1.5">
                        {aside}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}

function Detail({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return (
        <span
            className={cn(
                'text-[13px] font-semibold text-secondary',
                className,
            )}
        >
            {children}
        </span>
    );
}
