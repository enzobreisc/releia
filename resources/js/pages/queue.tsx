import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { Button, IconButton, Select, buttonClass } from '@/components/form';
import {
    DisplayTitle,
    PageHeader,
    SectionTitle,
} from '@/components/page-header';
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

type Translator = ReturnType<typeof useTranslation>;

export default function Queue({
    queue,
    pace,
    available,
    shopping_pending,
}: QueueProps) {
    const { t } = useTranslation();
    const [items, setItems] = useState(queue);

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

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title={t('Fila')}
                description={t('O que ler a seguir')}
                actions={
                    <Link
                        href={shoppingIndex.url()}
                        className={buttonClass(
                            'ghost',
                            'h-10 px-4 text-[13px]',
                        )}
                    >
                        {t('Lista de compras')}
                        {shopping_pending > 0 && (
                            <span className="font-mono text-[11px] font-normal text-muted">
                                {t(':count por comprar', {
                                    count: shopping_pending,
                                })}
                            </span>
                        )}
                    </Link>
                }
            />

            {items[0] && <NextBook item={items[0]} />}

            <PaceTiles pace={pace} />

            <QueueList items={items} available={available} onCommit={commit} />
        </div>
    );
}

function NextBook({ item }: { item: QueueEntry }) {
    const translator = useTranslation();
    const { t } = translator;

    return (
        <section
            aria-label={t('Próximo')}
            className="flex flex-wrap items-end gap-10"
        >
            <BookCover
                src={item.cover_url}
                title={item.title}
                className="w-42 shadow-hero"
            />
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 pb-1">
                <SectionTitle>{t('Próximo')}</SectionTitle>
                <DisplayTitle>{item.title}</DisplayTitle>
                <p className="text-[17px] font-semibold text-secondary">
                    {item.authors || t('Autor desconhecido')}
                </p>
                <p className="font-mono text-[13px] text-muted">
                    {queueMeta(item, translator)}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        className="h-12 px-6.5 text-[15px]"
                        onClick={() => router.post(startBook.url(item.id))}
                    >
                        {t('Começar')}
                    </Button>
                    <RemoveButton item={item} />
                </div>
            </div>
        </section>
    );
}

function RemoveButton({ item }: { item: QueueEntry }) {
    const { t } = useTranslation();

    return (
        <IconButton
            variant="plain"
            label={t('Tirar :title da fila', { title: item.title })}
            onClick={() =>
                router.delete(destroyQueueItem.url(item.queue_item_id), {
                    preserveScroll: true,
                })
            }
        >
            ×
        </IconButton>
    );
}

function QueueList({
    items,
    available,
    onCommit,
}: {
    items: QueueEntry[];
    available: NoteBook[];
    onCommit: (next: QueueEntry[]) => void;
}) {
    const translator = useTranslation();
    const { t, ordinal } = translator;
    const [dragging, setDragging] = useState<number | null>(null);
    const [addId, setAddId] = useState(String(available[0]?.id ?? ''));
    const upcoming = items.slice(1);

    function move(index: number, delta: number) {
        const target = index + delta;

        if (target < 0 || target >= items.length) {
            return;
        }

        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        onCommit(next);
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
        onCommit(next);
    }

    return (
        <section
            aria-label={t('Próximos a ler')}
            className="flex flex-col gap-3.5"
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>
                    {t('próximos a ler · :count', { count: items.length })}
                </SectionTitle>
                {items.length > 1 && (
                    <span className="text-xs font-semibold text-muted">
                        {t('arraste para reordenar')}
                    </span>
                )}
            </div>

            {items.length === 0 && (
                <p className={cardClass('p-5 text-sm text-muted')}>
                    {t(
                        'A fila está vazia. Adicione um livro da sua lista "quero ler" abaixo ou pelo botão "+ fila" na biblioteca.',
                    )}
                </p>
            )}

            {upcoming.length > 0 && (
                <ol className={cardClass('flex flex-col overflow-hidden')}>
                    {upcoming.map((item, offset) => {
                        const index = offset + 1;

                        return (
                            <li
                                key={item.queue_item_id}
                                draggable
                                onDragStart={() => setDragging(index)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => onDrop(event, index)}
                                onDragEnd={() => setDragging(null)}
                                className={cn(
                                    'flex flex-wrap items-center gap-4 border-b px-4.5 py-3 last:border-b-0',
                                    dragging === index && 'opacity-50',
                                )}
                            >
                                <span className="w-7 font-mono text-[13px] text-faint">
                                    {ordinal(index + 1)}
                                </span>
                                <BookCover
                                    src={item.cover_url}
                                    title={item.title}
                                    className="w-9"
                                />
                                <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
                                    <span className="truncate text-[15px] font-extrabold">
                                        {item.title}
                                    </span>
                                    <span className="truncate text-[13px] font-medium text-muted">
                                        {item.authors ||
                                            t('Autor desconhecido')}
                                    </span>
                                </span>
                                <span className="font-mono text-xs text-muted">
                                    {queueMeta(item, translator)}
                                </span>
                                <span className="flex gap-1.5">
                                    <IconButton
                                        label={t('Subir :title', {
                                            title: item.title,
                                        })}
                                        onClick={() => move(index, -1)}
                                    >
                                        ↑
                                    </IconButton>
                                    <IconButton
                                        label={t('Descer :title', {
                                            title: item.title,
                                        })}
                                        disabled={index === items.length - 1}
                                        onClick={() => move(index, 1)}
                                    >
                                        ↓
                                    </IconButton>
                                    <RemoveButton item={item} />
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}

            {available.length > 0 && (
                <form
                    className="flex flex-wrap items-end gap-2.5"
                    onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        router.post(
                            storeQueueItem.url(),
                            { book_id: Number(addId) },
                            { preserveScroll: true },
                        );
                    }}
                >
                    <label className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5 text-xs font-bold text-muted">
                        {t('Adicionar da biblioteca (quero ler)')}
                        <Select
                            value={addId}
                            onChange={(event) => setAddId(event.target.value)}
                        >
                            {available.map((book) => (
                                <option key={book.id} value={book.id}>
                                    {book.title}
                                </option>
                            ))}
                        </Select>
                    </label>
                    <Button type="submit" variant="ghost">
                        {t('Adicionar')}
                    </Button>
                </form>
            )}
        </section>
    );
}

/** "264 pp · ~9 days · ends ~Oct 23" */
function queueMeta(item: QueueEntry, { t, plural, shortDate }: Translator) {
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
            label: t('Seu ritmo'),
            value: String(perDay),
            unit: t('págs/dia'),
            title: pace.from_sessions
                ? t('Média dos dias lidos nos últimos 30 dias')
                : t('Padrão, sem sessões registradas'),
        },
        {
            label: t('Fila inteira'),
            value: pace.queue_days ? `~${pace.queue_days}` : '—',
            unit: t('dias'),
            title: t('Soma da previsão de cada livro da fila'),
        },
    ];

    return (
        <dl className="flex flex-wrap gap-4">
            {tiles.map((tile) => (
                <div
                    key={tile.label}
                    title={tile.title}
                    className={cardClass(
                        'flex flex-[1_1_220px] flex-col gap-1.5 p-4.5',
                    )}
                >
                    <dt className="text-xs font-bold text-muted">
                        {tile.label}
                    </dt>
                    <dd className="text-[30px] font-extrabold tracking-tight">
                        {tile.value}{' '}
                        <span className="text-sm font-semibold text-muted">
                            {tile.unit}
                        </span>
                    </dd>
                </div>
            ))}
        </dl>
    );
}
