import { useTranslation } from '@/hooks/use-translation';
import { isOngoing } from '@/lib/timeline';
import { cn } from '@/lib/utils';
import type { TimelineReading, TimelineStatus } from '@/types';

export const MONTH_COUNT = 12;

export const MONTH_GRID = `repeating-linear-gradient(90deg, var(--color-surface) 0, var(--color-surface) calc(100% / ${MONTH_COUNT} - 1px), var(--color-active) calc(100% / ${MONTH_COUNT} - 1px), var(--color-active) calc(100% / ${MONTH_COUNT}))`;

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
    const { t, shortDate } = useTranslation();

    return (reading: TimelineReading) => {
        const end = isOngoing(reading)
            ? t('hoje')
            : shortDate(reading.finished_at ?? reading.started_at);
        const abandoned =
            reading.status === 'abandoned' ? ` · ${t('deixado de lado')}` : '';

        return `${reading.title} · ${shortDate(reading.started_at)} → ${end}${abandoned}`;
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

export function DateRange({ reading }: { reading: TimelineReading }) {
    const { t, shortDate } = useTranslation();
    const isLive = isOngoing(reading);

    return (
        <span className="flex items-baseline gap-2 font-mono text-[13px] font-medium">
            <span>{shortDate(reading.started_at)}</span>
            <span className="text-accent">→</span>
            <span className={cn(isLive && 'text-link')}>
                {isLive || !reading.finished_at
                    ? t('hoje')
                    : shortDate(reading.finished_at)}
            </span>
        </span>
    );
}

export function ReadingTag({ reading }: { reading: TimelineReading }) {
    const { t } = useTranslation();

    if (reading.status === 'abandoned') {
        return (
            <span className="text-[11px] font-bold text-warn">
                {t('deixado de lado')}
            </span>
        );
    }

    return reading.is_reread ? (
        <span className="text-[11px] font-bold text-link">
            ↻ {t('releitura')}
        </span>
    ) : null;
}
