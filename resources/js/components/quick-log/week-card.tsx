import { cardClass } from '@/components/card';
import { heatClass } from '@/components/heat-map';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function WeekCard({ week, streak }: { week: number[]; streak: number }) {
    const { t, plural } = useTranslation();
    const readingDays = week.filter((level) => level > 0).length;

    return (
        <div
            className={cardClass(
                'flex items-center justify-between rounded-sm px-3.5 py-3',
            )}
        >
            <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-muted">
                    {t('Últimos 7 dias')}
                </span>
                <div
                    role="img"
                    aria-label={t(':count de 7 dias com leitura', {
                        count: readingDays,
                    })}
                    className="flex gap-1"
                >
                    {week.map((level, index) => (
                        <span
                            key={index}
                            className={cn(
                                heatClass(level),
                                'size-4 rounded-[4px] in-data-mobile:size-5',
                                index === week.length - 1 &&
                                    (level > 0
                                        ? 'ring-2 ring-heat-3'
                                        : 'ring-1 ring-primary ring-inset'),
                            )}
                        />
                    ))}
                </div>
            </div>
            <span className="text-[13px] font-extrabold">
                {t(':days seguidos', {
                    days: plural(streak, 'dia', 'dias'),
                })}
            </span>
        </div>
    );
}
