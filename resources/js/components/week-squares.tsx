import { heatClass } from '@/components/heat-map';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function WeekSquares({ week }: { week: number[] }) {
    const { t, weekdayInitial } = useTranslation();
    const today = new Date();

    return (
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
    );
}
