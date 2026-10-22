import { heatClass } from '@/components/heat-map';
import { ProgressBar } from '@/components/reading-progress';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { SidebarReading } from '@/types';

/** Mini "reading now" card in the sidebar: title, bar, week map and streak. */
export function SidebarReadingCard({ reading }: { reading: SidebarReading }) {
    const { t, plural } = useTranslation();

    return (
        <div className="mb-2 flex flex-col gap-2 rounded-sm border bg-bg p-3">
            <span className="font-mono text-[11px] text-faint">
                {t('lendo agora')}
            </span>
            <span className="truncate text-[13px] font-semibold">
                {reading.title}
            </span>
            <ProgressBar percent={reading.percent} className="h-1" />
            <div className="flex items-center gap-1">
                {reading.week.map((level, index) => (
                    <span
                        key={index}
                        aria-label={t('nível :level', { level })}
                        className={cn('size-3 rounded-[2px]', heatClass(level))}
                    />
                ))}
                <span className="ml-1.5 font-mono text-[11px] text-muted">
                    {plural(reading.streak, 'dia', 'dias')}
                </span>
            </div>
        </div>
    );
}
