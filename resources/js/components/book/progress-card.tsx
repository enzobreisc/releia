import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import { SessionForm } from '@/components/session-form';
import { useTranslation } from '@/hooks/use-translation';
import { start as startLiveSession } from '@/routes/live-session';
import type { ReadingHistory, ReadingProgress } from '@/types';

function projectFinishDate(
    daysLeft: number,
    shortDate: (date: string) => string,
): string {
    const date = new Date();
    date.setDate(date.getDate() + daysLeft);

    return shortDate(
        `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    );
}

export function ProgressCard({
    bookId,
    reading,
    progress,
    canLog,
    onFinish,
    onEditDates,
}: {
    bookId: number;
    reading: ReadingHistory;
    progress: ReadingProgress;
    canLog: boolean;
    onFinish: () => void;
    onEditDates: () => void;
}) {
    const { t, shortDate, ordinal } = useTranslation();
    const finishesOn =
        progress.days_left === null
            ? null
            : projectFinishDate(progress.days_left, shortDate);

    const stats = [
        {
            label: t('ritmo'),
            value:
                progress.pace === null
                    ? '—'
                    : t(':pages págs/dia', {
                          pages: Math.round(progress.pace),
                      }),
        },
        {
            label: t('termina'),
            value: finishesOn ? `~${finishesOn}` : '—',
        },
    ];

    return (
        <section
            aria-label={t('Progresso')}
            className={cardClass('flex flex-col gap-6.5 rounded-lg p-7')}
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>
                    {t('Progresso da :ordinal leitura', {
                        ordinal: ordinal(reading.number, 'feminine'),
                    })}
                </SectionTitle>
                {progress.percent !== null && (
                    <span className="font-mono text-[13px] text-link">
                        {progress.percent}%
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-3.5">
                <p className="flex items-baseline gap-3">
                    <span className="text-[88px] leading-[0.85] font-extrabold tracking-[-0.05em] tabular-nums">
                        {progress.current_page}
                    </span>
                    {progress.pages !== null && (
                        <span className="text-[22px] font-bold text-faint">
                            / {t(':pages págs', { pages: progress.pages })}
                        </span>
                    )}
                </p>
                <div className="h-2 overflow-hidden rounded-[4px] bg-border">
                    <div
                        className="h-full rounded-[4px] bg-text"
                        style={{ width: `${progress.percent ?? 0}%` }}
                    />
                </div>
            </div>

            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-4">
                {stats.map((stat) => (
                    <Stat key={stat.label} label={stat.label}>
                        {stat.value}
                    </Stat>
                ))}
                <Stat label={t('começou')}>
                    <span className="flex items-baseline gap-2.5">
                        {reading.started_at
                            ? shortDate(reading.started_at)
                            : '—'}
                        <button
                            type="button"
                            onClick={onEditDates}
                            aria-label={t('Editar data de início')}
                            className="text-xs font-bold text-link hover:underline"
                        >
                            {t('editar')}
                        </button>
                    </span>
                </Stat>
                <Stat label={t('sessões')}>{reading.sessions_count}</Stat>
            </dl>

            {progress.finish_suggested && (
                <div className="flex flex-wrap items-center gap-3 rounded-sm bg-active px-4 py-3 text-sm font-semibold inset-ring inset-ring-primary">
                    <span className="flex-1">
                        {t('Você chegou à última página.')}
                    </span>
                    <Button onClick={onFinish} className="h-9 text-[13px]">
                        {t('Terminar e avaliar')}
                    </Button>
                </div>
            )}

            <div id="log" className="border-t border-border pt-5.5">
                {canLog ? (
                    <div className="flex flex-col gap-4">
                        <SessionForm bookId={bookId} progress={progress} />
                        {!progress.finish_suggested && (
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    router.post(startLiveSession.url(bookId))
                                }
                                className="self-start"
                            >
                                {t('Iniciar sessão')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <p className="text-sm font-medium text-muted">
                        {t(
                            'Para registrar sessões, a leitura precisa estar em andamento.',
                        )}
                    </p>
                )}
            </div>
        </section>
    );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="text-xs font-bold text-muted first-letter:uppercase">
                {label}
            </dt>
            <dd className="text-[22px] font-extrabold">{children}</dd>
        </div>
    );
}
