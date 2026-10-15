import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Field, Input, Select } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/money';
import { index } from '@/routes/queue';
import {
    destroy as destroyQueueItem,
    reorder,
    store as storeQueueItem,
} from '@/routes/queue';
import {
    buy,
    destroy as destroyShopping,
    store as storeShopping,
} from '@/routes/shopping';
import type { Option } from '@/types';
import type { NoteBook } from '@/types/notes';
import type { Pace, QueueEntry, ShoppingEntry } from '@/types/queue';

type QueueProps = {
    queue: QueueEntry[];
    pace: Pace;
    available: NoteBook[];
    shopping: ShoppingEntry[];
    stores: Option[];
    filters: { store: string | null };
    totals: { pending_count: number; pending_cents: number };
};

export default function Queue({
    queue,
    pace,
    available,
    shopping,
    stores,
    filters,
    totals,
}: QueueProps) {
    return (
        <>
            <PageHeader
                title="Fila"
                description="O que ler a seguir e o que comprar"
            />

            <div className="flex flex-wrap items-start gap-6">
                <QueueSection queue={queue} pace={pace} available={available} />
                <ShoppingSection
                    shopping={shopping}
                    stores={stores}
                    storeFilter={filters.store}
                    totals={totals}
                />
            </div>
        </>
    );
}

function QueueSection({
    queue,
    pace,
    available,
}: {
    queue: QueueEntry[];
    pace: Pace;
    available: NoteBook[];
}) {
    const [items, setItems] = useState(queue);
    const [dragging, setDragging] = useState<number | null>(null);
    const [addId, setAddId] = useState(String(available[0]?.id ?? ''));

    useEffect(() => setItems(queue), [queue]);

    /** Otimista: a ordem muda na tela e depois é gravada; se o servidor recusar, recarrega. */
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

    const perDay = Math.round(pace.pages_per_day * 10) / 10;

    return (
        <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
            <SectionTitle>próximos a ler</SectionTitle>
            <p className="font-mono text-xs text-muted">
                ritmo: {perDay} págs/dia ·{' '}
                {pace.from_sessions
                    ? 'média dos dias lidos nos últimos 30 dias'
                    : 'padrão, sem sessões registradas'}
            </p>

            {items.length === 0 ? (
                <p className="rounded-md border bg-surface p-5 text-sm text-muted">
                    A fila está vazia. Adicione um livro da sua lista "quero
                    ler" abaixo ou pelo botão "+ fila" na biblioteca.
                </p>
            ) : (
                <ol className="flex flex-col gap-2.5">
                    {items.map((item, index) => (
                        <li
                            key={item.queue_item_id}
                            draggable
                            onDragStart={() => setDragging(index)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => onDrop(event, index)}
                            onDragEnd={() => setDragging(null)}
                            className={cn(
                                'flex items-center gap-3 rounded-md border bg-surface p-3.5',
                                index === 0 && 'border-primary',
                                dragging === index && 'opacity-50',
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className="cursor-grab font-mono text-sm text-faint select-none"
                            >
                                ::
                            </span>
                            <span className="w-6 font-mono text-sm text-muted">
                                {String(item.position).padStart(2, '0')}
                            </span>
                            <BookCover
                                src={item.cover_url}
                                title={item.title}
                                className="w-10 shrink-0"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate text-[15px] font-semibold">
                                    {item.title}
                                </span>
                                <span className="truncate text-[13px] text-muted">
                                    {item.authors || 'Autor desconhecido'}
                                </span>
                                <span className="font-mono text-[11px] text-muted">
                                    {item.pages
                                        ? `${item.pages} págs`
                                        : 'sem número de páginas'}
                                    {item.estimated_days !== null &&
                                        ` · ~${item.estimated_days} ${item.estimated_days === 1 ? 'dia' : 'dias'} no seu ritmo`}
                                </span>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <button
                                    type="button"
                                    aria-label={`Subir ${item.title}`}
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                    className="size-9 rounded-sm border bg-surface text-text hover:bg-active disabled:opacity-40"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Descer ${item.title}`}
                                    disabled={index === items.length - 1}
                                    onClick={() => move(index, 1)}
                                    className="size-9 rounded-sm border bg-surface text-text hover:bg-active disabled:opacity-40"
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Tirar ${item.title} da fila`}
                                    onClick={() =>
                                        router.delete(
                                            destroyQueueItem.url(
                                                item.queue_item_id,
                                            ),
                                            { preserveScroll: true },
                                        )
                                    }
                                    className="size-9 rounded-sm border bg-surface text-muted hover:bg-active hover:text-text"
                                >
                                    ×
                                </button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {available.length > 0 && (
                <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(event: FormEvent) => {
                        event.preventDefault();
                        router.post(
                            storeQueueItem.url(),
                            { book_id: Number(addId) },
                            { preserveScroll: true },
                        );
                    }}
                >
                    <Field
                        label="Adicionar da biblioteca (quero ler)"
                        className="flex-[1_1_220px]"
                    >
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
                    </Field>
                    <Button type="submit" variant="ghost">
                        Adicionar
                    </Button>
                </form>
            )}
        </section>
    );
}

function ShoppingSection({
    shopping,
    stores,
    storeFilter,
    totals,
}: {
    shopping: ShoppingEntry[];
    stores: Option[];
    storeFilter: string | null;
    totals: { pending_count: number; pending_cents: number };
}) {
    const [queueOnBuy, setQueueOnBuy] = useState(true);
    const form = useForm({
        title: '',
        author: '',
        isbn: '',
        store_type: stores[0]?.value ?? '',
        estimated_price: '',
    });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(storeShopping.url(), {
            preserveScroll: true,
            onSuccess: () =>
                form.reset('title', 'author', 'isbn', 'estimated_price'),
        });
    }

    function filterBy(store: string | null) {
        router.get(index.url(), store ? { store } : {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    return (
        <section className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-md border bg-surface p-5">
            <SectionTitle>lista de compras</SectionTitle>

            <div
                role="tablist"
                aria-label="Onde comprar"
                className="flex flex-wrap gap-2"
            >
                {[{ value: null, label: 'Todos' }, ...stores].map((store) => {
                    const selected = (storeFilter ?? null) === store.value;

                    return (
                        <button
                            key={store.label}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => filterBy(store.value)}
                            className={cn(
                                'rounded-sm px-3.5 py-2 text-sm',
                                selected
                                    ? 'bg-primary font-semibold text-white'
                                    : 'border bg-surface text-text hover:bg-active',
                            )}
                        >
                            {store.label}
                        </button>
                    );
                })}
            </div>

            <label className="flex items-center gap-2 text-[13px] text-muted">
                <input
                    type="checkbox"
                    checked={queueOnBuy}
                    onChange={(event) => setQueueOnBuy(event.target.checked)}
                    className="size-4"
                />
                Colocar na fila ao comprar
            </label>

            {shopping.length === 0 ? (
                <p className="text-sm text-muted">
                    Nenhum item nessa loja ainda.
                </p>
            ) : (
                <ul className="flex flex-col divide-y">
                    {shopping.map((item) => (
                        <li
                            key={item.id}
                            className="flex flex-wrap items-center gap-3 py-3"
                        >
                            <input
                                type="checkbox"
                                aria-label={`Marcar como comprado: ${item.title}`}
                                checked={item.bought}
                                disabled={item.bought}
                                onChange={() =>
                                    router.post(
                                        buy.url(item.id),
                                        { queue: queueOnBuy },
                                        { preserveScroll: true },
                                    )
                                }
                                className="size-5 shrink-0"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span
                                    className={cn(
                                        'text-sm font-semibold',
                                        item.bought &&
                                            'text-muted line-through',
                                    )}
                                >
                                    {item.title}
                                </span>
                                <span className="text-xs text-muted">
                                    {item.author || 'Autor não informado'} ·{' '}
                                    {item.store_label}
                                    {item.isbn && ` · ISBN ${item.isbn}`}
                                </span>
                                {item.bought && (
                                    <span className="font-mono text-[11px] text-muted">
                                        comprado em {item.bought_on}
                                        {item.queued && ' · na fila'}
                                    </span>
                                )}
                            </div>
                            {item.estimated_price_cents !== null && (
                                <span className="font-mono text-[13px]">
                                    {formatBRL(item.estimated_price_cents)}
                                </span>
                            )}
                            <button
                                type="button"
                                aria-label={`Excluir ${item.title}`}
                                onClick={() =>
                                    router.delete(
                                        destroyShopping.url(item.id),
                                        {
                                            preserveScroll: true,
                                        },
                                    )
                                }
                                className="size-8 rounded-sm border bg-surface text-muted hover:bg-active hover:text-text"
                            >
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
                <Field
                    label="Título"
                    className="sm:col-span-2"
                    error={form.errors.title}
                >
                    <Input
                        value={form.data.title}
                        onChange={(event) =>
                            form.setData('title', event.target.value)
                        }
                        placeholder="Título do livro"
                    />
                </Field>
                <Field label="Autor" error={form.errors.author}>
                    <Input
                        value={form.data.author}
                        onChange={(event) =>
                            form.setData('author', event.target.value)
                        }
                    />
                </Field>
                <Field label="ISBN (opcional)" error={form.errors.isbn}>
                    <Input
                        value={form.data.isbn}
                        onChange={(event) =>
                            form.setData('isbn', event.target.value)
                        }
                        inputMode="numeric"
                    />
                </Field>
                <Field label="Onde comprar" error={form.errors.store_type}>
                    <Select
                        value={form.data.store_type}
                        onChange={(event) =>
                            form.setData('store_type', event.target.value)
                        }
                    >
                        {stores.map((store) => (
                            <option key={store.value} value={store.value}>
                                {store.label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field
                    label="Preço estimado (R$)"
                    error={form.errors.estimated_price}
                >
                    <Input
                        value={form.data.estimated_price}
                        onChange={(event) =>
                            form.setData('estimated_price', event.target.value)
                        }
                        placeholder="34,90"
                        inputMode="decimal"
                    />
                </Field>
                <div className="sm:col-span-2">
                    <Button
                        type="submit"
                        variant="ghost"
                        disabled={
                            form.processing || form.data.title.trim() === ''
                        }
                    >
                        Adicionar item
                    </Button>
                </div>
            </form>

            <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-4">
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted">
                        Total estimado · {totals.pending_count}{' '}
                        {totals.pending_count === 1 ? 'item' : 'itens'} por
                        comprar
                    </span>
                    <span className="font-mono text-2xl font-bold">
                        {formatBRL(totals.pending_cents)}
                    </span>
                </div>
            </div>
        </section>
    );
}
