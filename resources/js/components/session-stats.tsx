import type { ReactNode } from 'react';
import { cardClass } from '@/components/card';
import { TodayProgress } from '@/components/today-progress';
import { WeekSquares } from '@/components/week-squares';
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
    const { t, plural } = useTranslation();

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
                <TodayProgress
                    pagesToday={pagesToday}
                    averagePages={averagePages}
                    dailyGoal={dailyGoal}
                />
            </Stat>

            <Stat label={t('Sequência')} value={plural(streak, 'dia', 'dias')}>
                <WeekSquares week={week} />
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
