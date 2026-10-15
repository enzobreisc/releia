import { ProgressBar } from '@/components/reading-progress';
import { cn } from '@/lib/utils';
import type { SidebarReading } from '@/types';

const heatClass = [
    'bg-heat-0',
    'bg-heat-1',
    'bg-heat-2',
    'bg-heat-3',
    'bg-heat-4',
];

/** Mini cartão "lendo agora" da barra lateral: título, barra, mapa da semana e sequência. */
export function SidebarReadingCard({ reading }: { reading: SidebarReading }) {
    return (
        <div className="mb-2 flex flex-col gap-2 rounded-sm border bg-bg p-3">
            <span className="font-mono text-[11px] text-faint">
                lendo agora
            </span>
            <span className="truncate text-[13px] font-semibold">
                {reading.title}
            </span>
            <ProgressBar percent={reading.percent} className="h-1" />
            <div className="flex items-center gap-1">
                {reading.week.map((level, index) => (
                    <span
                        key={index}
                        aria-label={`nível ${level}`}
                        className={cn('size-3 rounded-[2px]', heatClass[level])}
                    />
                ))}
                <span className="ml-1.5 font-mono text-[11px] text-muted">
                    {reading.streak} {reading.streak === 1 ? 'dia' : 'dias'}
                </span>
            </div>
        </div>
    );
}
