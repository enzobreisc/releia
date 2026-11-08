import type { ReactNode } from 'react';
import { STATUS_DOT } from '@/components/book/constants';
import { cardClass } from '@/components/card';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { ReadingHistory } from '@/types';

export function ClosedCard({
    tone,
    title,
    reading,
    extra,
    onEditDates,
}: {
    tone: 'read' | 'abandoned';
    title: string;
    reading: ReadingHistory;
    extra?: ReactNode;
    onEditDates: () => void;
}) {
    const { t, plural, shortDate } = useTranslation();
    const details = [
        plural(reading.sessions_count, 'sessão', 'sessões'),
        reading.pages_per_day !== null &&
            tone === 'read' &&
            t(':pages págs/dia', { pages: Math.round(reading.pages_per_day) }),
    ].filter(Boolean);

    return (
        <section
            className={cardClass(
                cn(
                    'flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg px-6 py-5',
                    tone === 'abandoned' && 'inset-ring-warn-line',
                ),
            )}
        >
            <div className="flex items-center gap-2.5">
                <span
                    aria-hidden="true"
                    className={cn('size-1.5 rounded-full', STATUS_DOT[tone])}
                />
                <span className="text-[15px] font-extrabold">{title}</span>
            </div>
            <button
                type="button"
                onClick={onEditDates}
                title={t('Editar datas')}
                className="font-mono text-[13px] text-secondary hover:text-text"
            >
                {reading.started_at ? shortDate(reading.started_at) : '—'} →{' '}
                {reading.finished_at ? shortDate(reading.finished_at) : '—'}{' '}
                <span className="text-link">✎</span>
            </button>
            <span className="font-mono text-[13px] text-muted">
                {details.join(' · ')}
            </span>
            {extra}
        </section>
    );
}
