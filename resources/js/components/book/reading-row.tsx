import { MAX_RATING, STATUS_DOT } from '@/components/book/constants';
import { SessionLog } from '@/components/session-log';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { ReadingHistory } from '@/types';

export function ReadingRow({
    reading,
    pages,
    isCurrent,
    expanded,
    canDelete,
    onToggle,
    onEditDates,
    onDelete,
}: {
    reading: ReadingHistory;
    pages: number | null;
    isCurrent: boolean;
    expanded: boolean;
    canDelete: boolean;
    onToggle: () => void;
    onEditDates: () => void;
    onDelete: () => void;
}) {
    const { t, plural, shortDate, ordinal } = useTranslation();
    const hasDetails = reading.sessions_count > 0 || reading.review;

    return (
        <article className="border-b border-border last:border-b-0">
            <div className="grid grid-cols-[minmax(100px,1fr)_minmax(100px,0.9fr)_minmax(160px,2fr)_auto] items-center gap-3.5 px-5 py-4 max-md:grid-cols-1">
                <span className="text-[15px] font-extrabold">
                    {t(':ordinal leitura', {
                        ordinal: ordinal(reading.number, 'feminine'),
                    })}
                </span>
                <span className="flex items-center gap-1.75 text-[13px] font-bold text-secondary">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-1.5 rounded-full',
                            STATUS_DOT[reading.status],
                        )}
                    />
                    {reading.status_label}
                </span>
                <span className="font-mono text-xs text-muted">
                    {readingDetail(reading, pages, { t, plural, shortDate })}
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold">
                    <ReadingRating reading={reading} isCurrent={isCurrent} />
                    {hasDetails && (
                        <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={onToggle}
                            className="text-link hover:underline"
                        >
                            {expanded ? t('fechar') : t('sessões e resenha ›')}
                        </button>
                    )}
                    {reading.status !== 'want_to_read' && (
                        <button
                            type="button"
                            onClick={onEditDates}
                            className="text-secondary hover:text-text"
                        >
                            {t('datas')}
                        </button>
                    )}
                    {canDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="text-secondary hover:text-danger"
                        >
                            {t('apagar')}
                        </button>
                    )}
                </span>
            </div>
            {expanded && (
                <div className="flex flex-col gap-4 px-5 pb-5">
                    <SessionLog sessions={reading.sessions} readOnly />
                    {reading.review && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold text-muted">
                                {t('Resenha')}
                            </span>
                            <p className="text-sm leading-relaxed font-medium whitespace-pre-line text-secondary">
                                {reading.review}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

function ReadingRating({
    reading,
    isCurrent,
}: {
    reading: ReadingHistory;
    isCurrent: boolean;
}) {
    const { t } = useTranslation();

    if (reading.rating !== null) {
        return (
            <span
                aria-label={t('Nota :rating de 5', { rating: reading.rating })}
                className="text-sm tracking-widest text-text"
            >
                {'★'.repeat(reading.rating)}
                <span className="text-strong">
                    {'★'.repeat(MAX_RATING - reading.rating)}
                </span>
            </span>
        );
    }

    if (isCurrent && reading.status !== 'want_to_read') {
        return <span className="text-muted">{t('sem nota ainda')}</span>;
    }

    return null;
}

function readingDetail(
    reading: ReadingHistory,
    pages: number | null,
    {
        t,
        plural,
        shortDate,
    }: Pick<ReturnType<typeof useTranslation>, 't' | 'plural' | 'shortDate'>,
): string {
    if (reading.status === 'want_to_read') {
        return t('ainda não começou');
    }

    if (reading.status === 'reading') {
        return t('desde :date · p. :page', {
            date: reading.started_at ? shortDate(reading.started_at) : '—',
            page: pages
                ? t(':page de :pages', { page: reading.current_page, pages })
                : reading.current_page,
        });
    }

    return [
        reading.started_at && reading.finished_at
            ? `${shortDate(reading.started_at)} → ${shortDate(reading.finished_at)} ${reading.finished_at.slice(0, 4)}`
            : null,
        reading.days && plural(reading.days, 'dia', 'dias'),
        plural(reading.sessions_count, 'sessão', 'sessões'),
        reading.abandon_reason &&
            t('motivo: :reason', { reason: reading.abandon_reason }),
    ]
        .filter(Boolean)
        .join(' · ');
}
