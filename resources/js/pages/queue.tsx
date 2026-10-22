import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button } from '@/components/form';
import { GripIcon, PlusIcon } from '@/components/icons';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import {
    destroy as destroyQueueItem,
    reorder,
    store as storeQueueItem,
} from '@/routes/queue';
import { start as startBook } from '@/routes/books';
import { index as shoppingIndex } from '@/routes/shopping';
import type { NoteBook } from '@/types/notes';
import type { Pace, QueueEntry } from '@/types/queue';

type QueueProps = {
    queue: QueueEntry[];
    pace: Pace;
    available: NoteBook[];
    shopping_pending: number;
};

export default function Queue({
    queue,
    pace,
    available,
    shopping_pending,
}: QueueProps) {
    const { t } = useTranslation();

    return (
        <>
            <PageHeader
                title={t('Fila')}
                description={t('O que ler a seguir')}
                actions={<PaceTiles pace={pace} />}
            />

            <QueueSection queue={queue} available={available} />

            <Link
                href={shoppingIndex.url()}
                className="mt-4 inline-flex text-[13px] text-accent hover:underline"
            >
                {t('Lista de compras')}
                {shopping_pending > 0 &&
                    ` (${t(':count por comprar', { count: shopping_pending })})`}{' '}
                →
            </Link>
        </>
    );
}

function QueueSection({
    queue,
    available,
}: {
    queue: QueueEntry[];
    available: NoteBook[];
}) {
    const translator = useTranslation();
    const { t } = translator;
    const [items, setItems] = useState(queue);
    const [dragging, setDragging] = useState<number | null>(null);
    const [addId, setAddId] = useState(String(available[0]?.id ?? ''));

    useEffect(() => setItems(queue), [queue]);

    /** Optimistic: the order changes on screen and is saved afterwards; if the server refuses, it reloads. */
    function commit(next: QueueEntry[]) {
        setItems(next);
        router.patch(
            reorder.url(),
            { ids: next.map((item) => item.queue_item_id) },
            {
                preserveScroll: true,
                onError: () => router.reload({ only: ['queue'] }),
            },
        );
    }

    function move(index: number, delta: number) {
        const target = index + delta;

        if (target < 0 || target >= items.length) {
            return;
        }

        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        commit(next);
    }

    function onDrop(event: DragEvent<HTMLLIElement>, targetIndex: number) {
        event.preventDefault();

        if (dragging === null || dragging === targetIndex) {
            return;
        }

        const next = [...items];
        const [moved] = next.splice(dragging, 1);
        next.splice(targetIndex, 0, moved);
        setDragging(null);
        commit(next);
    }

    return (
        <section
            aria-label={t('Próximos a ler')}
            className="flex min-w-0 flex-[1_1_340px] flex-col gap-2.5"
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>
                    {t('próximos a ler · :count', { count: items.length })}
                </SectionTitle>
                {items.length > 1 && (
                    <span className="font-mono text-[11px] text-faint">
                        {t('arraste para reordenar')}
                    </span>
                )}
            </div>

            {items.length === 0 ? (
                <p className="rounded-md border bg-surface p-5 text-sm text-muted">
                    {t(
                        'A fila está vazia. Adicione um livro da sua lista "quero ler" abaixo ou pelo botão "+ fila" na biblioteca.',
                    )}
                </p>
            ) : (
                <ol className="flex flex-col gap-2">
                    {items.map((item, index) => (
                        <li
                            key={item.queue_item_id}
                            draggable
                            onDragStart={() => setDragging(index)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => onDrop(event, index)}
                            onDragEnd={() => setDragging(null)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-md border py-3 pr-3 pl-1.5',
                                index === 0
                                    ? 'border-primary bg-active'
                                    : 'bg-surface',
                                dragging === index && 'opacity-50',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className="flex h-11 w-6 cursor-grab items-center justify-center text-faint"
                            >
                                <GripIcon />
                            </span>
                            <span
                                className={cn(
                                    'font-mono text-[13px]',
                                    index === 0 ? 'text-accent' : 'text-faint',
                                )}
                            >
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <BookCover
                                src={item.cover_url}
                                title={item.title}
                                className="w-9.5"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-[15px] font-semibold">
                                        {item.title}
                                    </span>
                                    {index === 0 && (
                                        <span className="shrink-0 rounded-[4px] bg-bg px-1.5 py-px font-mono text-[10px] text-accent">
                                            {t('próximo')}
                                        </span>
                                    )}
                                </div>
                                <span className="truncate text-[13px] text-muted">
                                    {item.authors || t('Autor desconhecido')}
                                </span>
                                <span className="font-mono text-[11px] text-muted">
                                    {queueMeta(item, translator)}
                                </span>
                            </div>
                            {/* Start works for any item; the first one is highlighted. */}
                            <button
                                type="button"
                                onClick={() =>
                                    router.post(startBook.url(item.id))
                                }
                                className={cn(
                                    'shrink-0 rounded-sm px-3.5 py-2.5 text-[13px] font-semibold',
                                    index === 0
                                        ? 'bg-primary text-white hover:bg-primary/90'
                                        : 'border text-nav hover:bg-bg hover:text-text',
                                )}
                            >
                                {t('Começar')}
                            </button>
                            {/* Keyboard: move up and down, besides dragging. */}
                            <div className="flex shrink-0 gap-0.5">
                                <button
                                    type="button"
                                    aria-label={t('Subir :title', {
                                        title: item.title,
                                    })}
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                    className="size-8 rounded-sm text-[11px] text-muted hover:bg-bg hover:text-text disabled:opacity-30"
                                >
                                    ▲
                                </button>
                                <button
                                    type="button"
                                    aria-label={t('Descer :title', {
                                        title: item.title,
                                    })}
                                    disabled={index === items.length - 1}
                                    onClick={() => move(index, 1)}
                                    className="size-8 rounded-sm text-[11px] text-muted hover:bg-bg hover:text-text disabled:opacity-30"
                                >
                                    ▼
                                </button>
                            </div>
                            <button
                                type="button"
                                aria-label={t('Tirar :title da fila', {
                                    title: item.title,
                                })}
                                onClick={() =>
                                    router.delete(
                                        destroyQueueItem.url(
                                            item.queue_item_id,
                                        ),
                                        { preserveScroll: true },
                                    )
                                }
                                className="ml-1.5 size-9 shrink-0 rounded-sm border text-muted hover:bg-bg hover:text-text"
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ol>
            )}

            {available.length > 0 && (
                <form
                    className="flex items-stretch gap-2 rounded-md border border-dashed p-1.5"
                    onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        router.post(
                            storeQueueItem.url(),
                            { book_id: Number(addId) },
                            { preserveScroll: true },
                        );
                    }}
                >
                    <label className="flex min-w-0 flex-1 items-center gap-2.5 px-2">
                        <PlusIcon className="shrink-0 text-muted" />
                        <span className="sr-only">
                            {t('Adicionar da biblioteca (quero ler)')}
                        </span>
                        <select
                            value={addId}
                            onChange={(event) => setAddId(event.target.value)}
                            className="h-10 min-w-0 flex-1 bg-transparent text-sm text-text outline-none"
                        >
                            {available.map((book) => (
                                <option key={book.id} value={book.id}>
                                    {book.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Button type="submit" variant="ghost" className="h-10">
                        {t('Adicionar')}
                    </Button>
                </form>
            )}
        </section>
    );
}

/** "264 pp · ~9 days · ends ~Oct 23" */
function queueMeta(
    item: QueueEntry,
    { t, plural, shortDate }: ReturnType<typeof useTranslation>,
) {
    const parts = [
        item.pages
            ? t(':pages págs', { pages: item.pages })
            : t('sem número de páginas'),
    ];

    if (item.estimated_days !== null) {
        parts.push(`~${plural(item.estimated_days, 'dia', 'dias')}`);
    }

    if (item.finishes_on) {
        parts.push(t('termina ~:date', { date: shortDate(item.finishes_on) }));
    }

    return parts.join(' · ');
}

function PaceTiles({ pace }: { pace: Pace }) {
    const { t } = useTranslation();
    const perDay = Math.round(pace.pages_per_day * 10) / 10;
    const tiles = [
        {
            label: t('seu ritmo'),
            value: String(perDay),
            unit: t('págs/dia'),
            title: pace.from_sessions
                ? t('Média dos dias lidos nos últimos 30 dias')
                : t('Padrão, sem sessões registradas'),
        },
        {
            label: t('fila inteira'),
            value: pace.queue_days ? `~${pace.queue_days}` : '—',
            unit: t('dias'),
            title: t('Soma da previsão de cada livro da fila'),
        },
    ];

    return (
        <dl className="flex gap-2">
            {tiles.map((tile) => (
                <div
                    key={tile.label}
                    title={tile.title}
                    className="min-w-30 rounded-md border bg-surface px-3.5 py-2.5"
                >
                    <dt className="font-mono text-[11px] text-muted">
                        {tile.label}
                    </dt>
                    <dd className="mt-0.5 font-mono text-lg font-bold">
                        {tile.value}{' '}
                        <span className="text-xs font-medium text-muted">
                            {tile.unit}
                        </span>
                    </dd>
                </div>
            ))}
        </dl>
    );
}
