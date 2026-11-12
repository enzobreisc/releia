import { Link, router } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { index as queueIndex } from '@/routes/queue';
import { start } from '@/routes/books';
import type { NextInQueue } from '@/types';

export function NextInQueueCard({
    next,
    pagesPerDay,
}: {
    next: NextInQueue | null;
    pagesPerDay: number | null;
}) {
    const { t, plural, ordinal } = useTranslation();
    const days =
        next?.pages != null && pagesPerDay
            ? Math.max(1, Math.ceil(next.pages / pagesPerDay))
            : null;

    return (
        <section
            aria-labelledby="next-in-queue-title"
            className={cardClass(
                'flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 p-4.5',
            )}
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2
                    id="next-in-queue-title"
                    className="text-xs font-bold text-muted"
                >
                    {t('Próximo da fila')}
                </h2>
                {next && (
                    <span className="font-mono text-xs text-muted">
                        {t(':position de :total', {
                            position: ordinal(next.position),
                            total: next.total,
                        })}
                    </span>
                )}
            </div>
            {next ? (
                <>
                    <div className="flex items-center gap-3.5">
                        <BookCover
                            src={next.cover_url}
                            title={next.title}
                            className="w-14"
                        />
                        <span className="flex min-w-0 flex-col gap-1">
                            <span className="text-[15px] font-extrabold">
                                {next.title}
                            </span>
                            <span className="text-xs font-semibold text-secondary">
                                {next.authors}
                            </span>
                            {next.pages !== null && (
                                <span className="font-mono text-xs text-muted">
                                    {t(':pages págs', { pages: next.pages })}
                                    {days !== null &&
                                        ` · ${t('cerca de :duration no seu ritmo', { duration: plural(days, 'dia', 'dias') })}`}
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            className="h-9 px-3.5 text-[13px]"
                            onClick={() => router.post(start(next.book_id).url)}
                        >
                            {t('Começar')}
                        </Button>
                        <Link
                            href={queueIndex.url()}
                            className="inline-flex h-9 items-center rounded-full bg-elevated px-3.5 text-[13px] font-bold text-text inset-ring inset-ring-strong hover:bg-active"
                        >
                            {t('Ver fila')}
                        </Link>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-[15px] font-bold">
                        {t('A fila está vazia')}
                    </p>
                    <Link
                        href={queueIndex.url()}
                        className="text-xs font-bold text-link hover:underline"
                    >
                        {t('Escolher o próximo')}
                    </Link>
                </>
            )}
        </section>
    );
}
