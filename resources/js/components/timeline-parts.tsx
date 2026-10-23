import { useTranslation } from '@/hooks/use-translation';
import { isOngoing } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import type { TimelineReading, TimelineStatus } from '@/types';

export const MONTH_COUNT = 12;

export function barClass(status: TimelineStatus): string {
    switch (status) {
        case 'abandoned':
            return 'bg-linear-to-r from-warn-line to-transparent';
        case 'reading':
            return 'bg-heat-2 ring-[1.5px] ring-text';
        case 'read':
            return 'bg-heat-1';
    }
}

export function yearTone(position: number): string {
    if (position === 0) {
        return 'text-text';
    }

    return position === 1 ? 'text-secondary' : 'text-faint';
}

export function YearLabel({
    year,
    position,
}: {
    year: number;
    position: number;
}) {
    return (
        <span
            className={cn(
                'text-[44px] leading-[0.9] font-extrabold tracking-tighter',
                yearTone(position),
            )}
        >
            {year}
        </span>
    );
}

export function RereadMark({ className }: { className?: string }) {
    const { t } = useTranslation();

    return (
        <span
            role="img"
            aria-label={t('releitura')}
            className={cn('text-heat-4', className)}
        >
            ↻
        </span>
    );
}

export function useReadingTooltip() {
    const { t, monthYear } = useTranslation();

    return (reading: TimelineReading) => {
        const end = isOngoing(reading)
            ? t('hoje')
            : monthYear(reading.finished_at ?? reading.started_at);
        const abandoned =
            reading.status === 'abandoned' ? ` · ${t('deixado de lado')}` : '';

        return `${reading.title} · ${monthYear(reading.started_at)} → ${end}${abandoned}`;
    };
}

export function Legend() {
    const { t } = useTranslation();
    const swatch = 'h-2 w-[22px] rounded-full';

    return (
        <div className="flex flex-wrap gap-x-[22px] gap-y-2 text-xs font-semibold text-muted">
            <span className="flex items-center gap-2">
                <span className={cn(swatch, barClass('read'))} />
                {t('lido')}
            </span>
            <span className="flex items-center gap-2">
                <span className={cn(swatch, barClass('reading'))} />
                {t('lendo agora')}
            </span>
            <span className="flex items-center gap-2">
                <span className={cn(swatch, barClass('abandoned'))} />
                {t('deixado de lado')}
            </span>
            <span className="flex items-center gap-2">
                <RereadMark className="text-[13px] text-link" />
                {t('releitura')}
            </span>
        </div>
    );
}
