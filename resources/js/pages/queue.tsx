import { router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FormEvent, MouseEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Field, Input, Segmented } from '@/components/form';
import { ClockIcon, GripIcon, PlusIcon } from '@/components/icons';
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
    open as openShopping,
    store as storeShopping,
    update as updateShopping,
} from '@/routes/shopping';
import type { Option } from '@/types';
import { reading as readingRoute, show as showBook } from '@/routes/books';
import type { Candidate } from '@/types/library';
import type { NoteBook } from '@/types/notes';
import type {
    Pace,
    QueueEntry,
    ShoppingEntry,
    ShoppingMatches,
    StoreOption,
} from '@/types/queue';

type QueueProps = {
    queue: QueueEntry[];
    pace: Pace;
    available: NoteBook[];
    shopping: ShoppingEntry[];
    stores: StoreOption[];
    filters: { store: string | null };
    totals: { pending_count: number; pending_cents: number };
    matches?: ShoppingMatches;
};

export default function Queue({
    queue,
    pace,
    available,
    shopping,
    stores,
    filters,
    totals,
    matches,
}: QueueProps) {
    return (
        <>
            <PageHeader
                title="Fila"
                description="O que ler a seguir e o que comprar"
                actions={<PaceTiles pace={pace} />}
            />

            <div className="flex flex-wrap items-start gap-6">
                <QueueSection queue={queue} available={available} />
                <ShoppingSection
                    shopping={shopping}
                    stores={stores}
                    storeFilter={filters.store}
                    totals={totals}
                    matches={matches}
                />
            </div>
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

    return (
        <section
            aria-label="Próximos a ler"
            className="flex min-w-0 flex-[1_1_340px] flex-col gap-2.5"
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>{`próximos a ler · ${items.length}`}</SectionTitle>
                {items.length > 1 && (
                    <span className="font-mono text-[11px] text-faint">
                        arraste para reordenar
                    </span>
                )}
            </div>

            {items.length === 0 ? (
                <p className="rounded-md border bg-surface p-5 text-sm text-muted">
                    A fila está vazia. Adicione um livro da sua lista "quero
                    ler" abaixo ou pelo botão "+ fila" na biblioteca.
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
                                            próximo
                                        </span>
                                    )}
                                </div>
                                <span className="truncate text-[13px] text-muted">
                                    {item.authors || 'Autor desconhecido'}
                                </span>
                                <span className="font-mono text-[11px] text-muted">
                                    {queueMeta(item)}
                                </span>
                            </div>
                            {index === 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.patch(
                                            readingRoute.url(item.id),
                                            { status: 'reading' },
                                            {
                                                onSuccess: () =>
                                                    router.visit(
                                                        showBook.url(item.id),
                                                    ),
                                            },
                                        )
                                    }
                                    className="shrink-0 rounded-sm bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-primary/90"
                                >
                                    Começar
                                </button>
                            )}
                            {/* Teclado: subir e descer, além do arrastar. */}
                            <div className="flex shrink-0 flex-col">
                                <button
                                    type="button"
                                    aria-label={`Subir ${item.title}`}
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                    className="h-5 w-7 rounded-[4px] text-[11px] text-muted hover:bg-bg hover:text-text disabled:opacity-30"
                                >
                                    ▲
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Descer ${item.title}`}
                                    disabled={index === items.length - 1}
                                    onClick={() => move(index, 1)}
                                    className="h-5 w-7 rounded-[4px] text-[11px] text-muted hover:bg-bg hover:text-text disabled:opacity-30"
                                >
                                    ▼
                                </button>
                            </div>
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
                                className="size-9 shrink-0 rounded-sm border text-muted hover:bg-bg hover:text-text"
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
                            Adicionar da biblioteca (quero ler)
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
                        Adicionar
                    </Button>
                </form>
            )}
        </section>
    );
}

/** "264 págs · ~9 dias · termina ~23 out" */
function queueMeta(item: QueueEntry) {
    const parts = [item.pages ? `${item.pages} págs` : 'sem número de páginas'];

    if (item.estimated_days !== null) {
        parts.push(
            `~${item.estimated_days} ${item.estimated_days === 1 ? 'dia' : 'dias'}`,
        );
    }

    if (item.finishes_on) {
        parts.push(`termina ~${shortDate(item.finishes_on)}`);
    }

    return parts.join(' · ');
}

/** "2026-10-23" vira "23 out". */
function shortDate(date: string) {
    return new Date(`${date}T00:00:00`)
        .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
        .replace('.', '')
        .replace(' de ', ' ');
}

function PaceTiles({ pace }: { pace: Pace }) {
    const perDay = Math.round(pace.pages_per_day * 10) / 10;
    const tiles = [
        {
            label: 'seu ritmo',
            value: String(perDay),
            unit: 'págs/dia',
            title: pace.from_sessions
                ? 'Média dos dias lidos nos últimos 30 dias'
                : 'Padrão, sem sessões registradas',
        },
        {
            label: 'fila inteira',
            value: pace.queue_days ? `~${pace.queue_days}` : '—',
            unit: 'dias',
            title: 'Soma da previsão de cada livro da fila',
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

function ShoppingSection({
    shopping,
    stores,
    storeFilter,
    totals,
    matches,
}: {
    shopping: ShoppingEntry[];
    stores: StoreOption[];
    storeFilter: string | null;
    totals: { pending_count: number; pending_cents: number };
    matches?: ShoppingMatches;
}) {
    const [queueOnBuy, setQueueOnBuy] = useState(true);
    // Com uma busca em andamento (?match=), o formulário volta aberto.
    const [adding, setAdding] = useState(matches !== undefined);
    const allCount = stores.reduce((sum, store) => sum + store.count, 0);

    function filterBy(store: string | null) {
        router.get(index.url(), store ? { store } : {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    return (
        <section
            aria-label="Lista de compras"
            className="flex min-w-0 flex-[1.2_1_400px] flex-col rounded-md border bg-surface"
        >
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
                <SectionTitle>lista de compras</SectionTitle>
                <div className="text-right">
                    <div className="font-mono text-[22px] font-bold">
                        {formatBRL(totals.pending_cents)}
                    </div>
                    <div className="text-xs text-muted">
                        {totals.pending_count}{' '}
                        {totals.pending_count === 1 ? 'item' : 'itens'} por
                        comprar
                    </div>
                </div>
            </div>

            <div
                role="tablist"
                aria-label="Onde comprar"
                className="mx-5 mt-3 flex gap-0.5 overflow-x-auto border-b"
            >
                {[
                    { value: null, label: 'Todos', count: allCount },
                    ...stores,
                ].map((store) => {
                    const selected = (storeFilter ?? null) === store.value;

                    return (
                        <button
                            key={store.label}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => filterBy(store.value)}
                            className={cn(
                                '-mb-px border-b-2 px-3 py-2.5 text-[13px] whitespace-nowrap',
                                selected
                                    ? 'border-primary font-semibold text-text'
                                    : 'border-transparent text-muted hover:text-text',
                            )}
                        >
                            {store.label}{' '}
                            <span className="font-mono text-[11px] text-faint">
                                {store.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {shopping.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted">
                    Nenhum item nessa loja ainda.
                </p>
            ) : (
                <ul className="flex flex-col px-5">
                    {shopping.map((item) => (
                        <ShoppingRow
                            key={item.id}
                            item={item}
                            queueOnBuy={queueOnBuy}
                        />
                    ))}
                </ul>
            )}

            {adding ? (
                <ShoppingForm
                    stores={stores}
                    storeFilter={storeFilter}
                    matches={matches}
                    onClose={() => setAdding(false)}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="mx-5 mt-3.5 flex h-11 items-center justify-center gap-2 rounded-md border border-dashed text-sm font-semibold text-accent hover:bg-active"
                >
                    <PlusIcon />
                    Adicionar item
                </button>
            )}

            <label className="mx-5 mt-3.5 mb-4 flex items-center gap-2 text-xs text-muted">
                <input
                    type="checkbox"
                    checked={queueOnBuy}
                    onChange={(event) => setQueueOnBuy(event.target.checked)}
                    className="size-4 accent-primary"
                />
                Ao marcar como comprado, o livro vai para "quero ler" e entra no
                fim da fila
            </label>
        </section>
    );
}

function ShoppingRow({
    item,
    queueOnBuy,
}: {
    item: ShoppingEntry;
    queueOnBuy: boolean;
}) {
    const { native } = usePage().props;

    // No app nativo o link abre no navegador pelo servidor; no navegador, numa aba nova.
    function openLink(event: MouseEvent<HTMLAnchorElement>) {
        if (native) {
            event.preventDefault();
            router.post(
                openShopping.url(item.id),
                {},
                { preserveScroll: true },
            );
        }
    }

    return (
        <li className="flex items-center gap-3 border-b py-3">
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
                className="size-4.5 shrink-0 accent-primary"
            />
            <BookCover
                src={item.cover_url}
                title={item.title}
                className="w-8.5"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                    className={cn(
                        'truncate text-sm font-semibold',
                        item.bought && 'text-muted line-through',
                    )}
                >
                    {item.title}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {item.author || 'Autor não informado'}
                    <span className="rounded-[4px] border px-1.5 font-mono text-[10px]">
                        {item.store_label.toLowerCase()}
                    </span>
                </span>
                {item.bought ? (
                    <span className="font-mono text-[11px] text-muted">
                        comprado em {item.bought_on}
                        {item.queued && ' · na fila'}
                    </span>
                ) : (
                    <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={openLink}
                        className="self-start text-xs font-semibold text-accent hover:underline"
                    >
                        {item.link_label} ↗
                    </a>
                )}
            </div>
            <PriceEditor item={item} />
            <button
                type="button"
                aria-label={`Excluir ${item.title}`}
                onClick={() =>
                    router.delete(destroyShopping.url(item.id), {
                        preserveScroll: true,
                    })
                }
                className="size-8 shrink-0 rounded-sm text-muted hover:bg-active hover:text-text"
            >
                ×
            </button>
        </li>
    );
}

/** Preço anotado, com a data em que foi conferido. Clicar abre a edição. */
function PriceEditor({ item }: { item: ShoppingEntry }) {
    const [editing, setEditing] = useState(false);
    const form = useForm({
        estimated_price:
            item.estimated_price_cents === null
                ? ''
                : (item.estimated_price_cents / 100)
                      .toFixed(2)
                      .replace('.', ','),
    });

    function save(event: FormEvent) {
        event.preventDefault();
        form.patch(updateShopping.url(item.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    }

    if (editing) {
        return (
            <form onSubmit={save} className="flex items-center gap-2">
                <Input
                    aria-label={`Preço de ${item.title} (R$)`}
                    value={form.data.estimated_price}
                    onChange={(event) =>
                        form.setData('estimated_price', event.target.value)
                    }
                    placeholder="34,90"
                    inputMode="decimal"
                    autoFocus
                    className="h-9 w-24 font-mono"
                />
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={form.processing}
                    className="h-9"
                >
                    Salvar
                </Button>
                {form.errors.estimated_price && (
                    <span className="text-xs text-red-300">
                        {form.errors.estimated_price}
                    </span>
                )}
            </form>
        );
    }

    return (
        <button
            type="button"
            disabled={item.bought}
            onClick={() => setEditing(true)}
            title="Atualizar preço"
            className="flex shrink-0 flex-col items-end gap-0.5 rounded-sm px-2 py-1.5 hover:bg-active disabled:hover:bg-transparent"
        >
            <span className="font-mono text-sm font-bold">
                {item.estimated_price_cents === null
                    ? 'sem preço'
                    : formatBRL(item.estimated_price_cents)}
            </span>
            {item.price_checked_on && (
                <span
                    className={cn(
                        'flex items-center gap-1 font-mono text-[10px]',
                        item.price_stale ? 'text-nav' : 'text-faint',
                    )}
                >
                    {item.price_stale && <ClockIcon width={10} height={10} />}
                    {item.price_stale
                        ? `${shortDate(item.price_checked_on)} · conferir`
                        : `em ${shortDate(item.price_checked_on)}`}
                </span>
            )}
        </button>
    );
}

/**
 * Novo item. A busca aceita ISBN, título ou link da Amazon e mostra as
 * correspondências; escolher uma preenche o formulário com título, autor, ISBN e capa.
 */
function ShoppingForm({
    stores,
    storeFilter,
    matches,
    onClose,
}: {
    stores: Option[];
    storeFilter: string | null;
    matches?: ShoppingMatches;
    onClose: () => void;
}) {
    const [search, setSearch] = useState(matches?.query ?? '');
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState<string | null>(null);
    const priceInput = useRef<HTMLInputElement>(null);
    const form = useForm({
        title: '',
        author: '',
        isbn: '',
        cover_url: '',
        url: '',
        store_type:
            storeFilter ??
            stores.find((s) => s.value === 'online')?.value ??
            stores[0]?.value ??
            '',
        estimated_price: '',
    });

    function lookUp(event: FormEvent) {
        event.preventDefault();

        if (search.trim() === '') {
            return;
        }

        // Link colado: guarda no item, para abrir aquele anúncio em vez da busca.
        if (/^https?:\/\//i.test(search.trim())) {
            form.setData('url', search.trim());
        }

        setPicked(null);
        router.reload({
            only: ['matches'],
            data: { match: search.trim(), store: storeFilter ?? undefined },
            onStart: () => setSearching(true),
            onFinish: () => setSearching(false),
        });
    }

    function pick(candidate: Candidate) {
        setPicked(candidate.isbn_13 ?? candidate.title);
        form.clearErrors();
        form.setData((data) => ({
            ...data,
            title: candidate.title,
            author: candidate.authors.join(', '),
            isbn: candidate.isbn_13 ?? '',
            cover_url: candidate.cover_url ?? '',
        }));
        // O preço não vem das fontes de metadados: é a próxima coisa a preencher.
        priceInput.current?.focus();
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(storeShopping.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset(
                    'title',
                    'author',
                    'isbn',
                    'cover_url',
                    'url',
                    'estimated_price',
                );
                setSearch('');
                setPicked(null);
            },
        });
    }

    return (
        <div className="mx-5 mt-4 flex flex-col gap-3 rounded-md border border-primary bg-bg p-3.5">
            <div className="flex items-center justify-between">
                <SectionTitle>novo item</SectionTitle>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className="size-8 rounded-sm text-muted hover:bg-active hover:text-text"
                >
                    ×
                </button>
            </div>

            <form onSubmit={lookUp} className="flex items-end gap-2">
                <Field
                    label="ISBN, título ou link da Amazon"
                    className="flex-1"
                >
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cole o link do anúncio ou digite"
                        className="h-10.5 font-mono text-sm"
                    />
                </Field>
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={searching || search.trim() === ''}
                    className="h-10.5"
                >
                    {searching ? 'Buscando…' : 'Buscar'}
                </Button>
            </form>

            {matches && !searching && (
                <MatchList matches={matches} picked={picked} onPick={pick} />
            )}

            <form
                onSubmit={submit}
                className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2"
            >
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
                        className="h-10"
                    />
                </Field>
                <Field label="Autor" error={form.errors.author}>
                    <Input
                        value={form.data.author}
                        onChange={(event) =>
                            form.setData('author', event.target.value)
                        }
                        className="h-10"
                    />
                </Field>
                <Field label="ISBN (opcional)" error={form.errors.isbn}>
                    <Input
                        value={form.data.isbn}
                        onChange={(event) =>
                            form.setData('isbn', event.target.value)
                        }
                        inputMode="numeric"
                        className="h-10 font-mono"
                    />
                </Field>
                <Field
                    label="Link (opcional)"
                    className="sm:col-span-2"
                    error={form.errors.url}
                >
                    <Input
                        value={form.data.url}
                        onChange={(event) =>
                            form.setData('url', event.target.value)
                        }
                        placeholder="Sem link, o app abre a busca na Amazon pelo ISBN"
                        inputMode="url"
                        className="h-10"
                    />
                </Field>
                <fieldset className="flex min-w-0 flex-col">
                    <legend className="pb-1.5 text-[13px] text-muted">
                        Onde comprar
                    </legend>
                    <Segmented
                        options={stores}
                        value={form.data.store_type}
                        onChange={(value) => form.setData('store_type', value)}
                    />
                    {form.errors.store_type && (
                        <span className="text-xs text-red-300">
                            {form.errors.store_type}
                        </span>
                    )}
                </fieldset>
                <Field
                    label="Preço no anúncio (R$)"
                    error={form.errors.estimated_price}
                >
                    <Input
                        ref={priceInput}
                        value={form.data.estimated_price}
                        onChange={(event) =>
                            form.setData('estimated_price', event.target.value)
                        }
                        placeholder="34,90"
                        inputMode="decimal"
                        className="h-10 font-mono"
                    />
                </Field>
                <Button
                    type="submit"
                    disabled={form.processing || form.data.title.trim() === ''}
                    className="sm:col-span-2"
                >
                    Adicionar à lista
                </Button>
            </form>
        </div>
    );
}

function MatchList({
    matches,
    picked,
    onPick,
}: {
    matches: ShoppingMatches;
    picked: string | null;
    onPick: (candidate: Candidate) => void;
}) {
    if (matches.items.length === 0) {
        return (
            <p className="text-sm text-muted">
                Nenhuma correspondência para “{matches.query}”. Preencha os
                dados à mão abaixo.
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-2" aria-label="Correspondências">
            {matches.items.map((candidate) => {
                const key = candidate.isbn_13 ?? candidate.title;

                return (
                    <li key={key}>
                        <button
                            type="button"
                            onClick={() => onPick(candidate)}
                            aria-pressed={picked === key}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-sm border p-2 text-left hover:bg-active',
                                picked === key && 'border-primary bg-active',
                            )}
                        >
                            <BookCover
                                src={candidate.cover_url}
                                title={candidate.title}
                                className="w-9"
                            />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="truncate text-sm font-semibold">
                                    {candidate.title}
                                </span>
                                <span className="truncate text-xs text-muted">
                                    {candidate.authors.join(', ') ||
                                        'Autor não informado'}
                                    {candidate.publisher &&
                                        ` · ${candidate.publisher}`}
                                    {candidate.published_year &&
                                        ` · ${candidate.published_year}`}
                                    {candidate.isbn_13 &&
                                        ` · ISBN ${candidate.isbn_13}`}
                                </span>
                            </span>
                            {candidate.library_id !== null && (
                                <span className="font-mono text-[11px] text-muted">
                                    já na biblioteca
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
