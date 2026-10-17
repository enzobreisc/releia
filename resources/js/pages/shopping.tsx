import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Field, Input, Segmented, Select } from '@/components/form';
import { ClockIcon, PlusIcon } from '@/components/icons';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { shortDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { formatBRL } from '@/lib/money';
import { index as queueIndex } from '@/routes/queue';
import {
    buy,
    destroy as destroyShopping,
    index,
    open as openShopping,
    preference,
    price as lookupPrice,
    store as storeShopping,
    unbuy,
    update as updateShopping,
} from '@/routes/shopping';
import type { Option } from '@/types';
import type { Candidate } from '@/types/library';
import type {
    ShoppingEntry,
    ShoppingMatches,
    StoreOption,
} from '@/types/queue';

type ShoppingProps = {
    shopping: ShoppingEntry[];
    stores: StoreOption[];
    filters: ShoppingFilters;
    totals: { pending_count: number; pending_cents: number };
    queue_on_buy: boolean;
    queue_count: number;
    matches?: ShoppingMatches;
};

type ShoppingFilters = {
    store: string | null;
    status: string | null;
    q: string | null;
    sort: string | null;
};

const STATUS_FILTERS = [
    { value: null, label: 'Todos' },
    { value: 'pending', label: 'Por comprar' },
    { value: 'bought', label: 'Comprados' },
];

const SORT_OPTIONS = [
    { value: '', label: 'Ordem de adição' },
    { value: 'recent', label: 'Mais recentes' },
    { value: 'title', label: 'Título (A–Z)' },
    { value: 'price_asc', label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
];

export default function Shopping({
    shopping,
    stores,
    filters,
    totals,
    queue_on_buy,
    queue_count,
    matches,
}: ShoppingProps) {
    return (
        <>
            <PageHeader
                title="Compras"
                description="O que comprar e quanto vai custar"
            />

            <ShoppingSection
                shopping={shopping}
                stores={stores}
                filters={filters}
                totals={totals}
                queueOnBuy={queue_on_buy}
                matches={matches}
            />

            <Link
                href={queueIndex.url()}
                className="mt-4 inline-flex text-[13px] text-accent hover:underline"
            >
                Fila de leitura
                {queue_count > 0 && ` (${queue_count} na fila)`} →
            </Link>
        </>
    );
}

function ShoppingSection({
    shopping,
    stores,
    filters,
    totals,
    queueOnBuy,
    matches,
}: {
    shopping: ShoppingEntry[];
    stores: StoreOption[];
    filters: ShoppingFilters;
    totals: { pending_count: number; pending_cents: number };
    queueOnBuy: boolean;
    matches?: ShoppingMatches;
}) {
    // Com uma busca em andamento (?match=), o formulário volta aberto.
    const [adding, setAdding] = useState(matches !== undefined);
    const allCount = stores.reduce((sum, store) => sum + store.count, 0);

    const storeFilter = filters.store;
    const [search, setSearch] = useState(filters.q ?? '');
    const filtered = Boolean(
        filters.store || filters.status || filters.q || filters.sort,
    );

    function filterBy(change: Partial<ShoppingFilters>) {
        const next = { ...filters, ...change };
        const query = Object.fromEntries(
            Object.entries(next).filter(([, value]) => value),
        );

        router.get(index.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    // Busca com pausa para digitar: não recarrega a cada tecla.
    useEffect(() => {
        if (search.trim() === (filters.q ?? '')) {
            return;
        }

        const timer = setTimeout(
            () => filterBy({ q: search.trim() || null }),
            300,
        );

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <section
            aria-label="Lista de compras"
            className="flex min-w-0 flex-[1.2_1_400px] flex-col rounded-md border bg-surface"
        >
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
                <div className="flex flex-col items-start gap-2">
                    <SectionTitle>lista de compras</SectionTitle>
                    {/* Preferência salva: vale para toda compra, até mudar. */}
                    <button
                        type="button"
                        onClick={() =>
                            router.put(
                                preference.url(),
                                { queue_on_buy: !queueOnBuy },
                                { preserveScroll: true },
                            )
                        }
                        title="Clique para alternar"
                        className="h-7 rounded-full border px-2.5 text-xs text-nav hover:bg-active hover:text-text"
                    >
                        ao comprar:{' '}
                        {queueOnBuy ? 'quero ler + fila' : 'só quero ler'} ⇄
                    </button>
                </div>
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
                            onClick={() => filterBy({ store: store.value })}
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

            <div className="flex flex-wrap items-center gap-2 px-5 pt-3">
                <Input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por título ou autor"
                    aria-label="Buscar na lista"
                    className="h-9 min-w-44 flex-1 text-[13px]"
                />
                <Select
                    value={filters.sort ?? ''}
                    onChange={(event) =>
                        filterBy({ sort: event.target.value || null })
                    }
                    aria-label="Ordenar"
                    className="h-9 w-auto text-[13px]"
                >
                    {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
                <div
                    role="group"
                    aria-label="Situação"
                    className="flex gap-1 rounded-md border bg-bg p-0.5"
                >
                    {STATUS_FILTERS.map((option) => (
                        <button
                            key={option.label}
                            type="button"
                            aria-pressed={filters.status === option.value}
                            onClick={() => filterBy({ status: option.value })}
                            className={cn(
                                'h-8 rounded-[5px] px-2.5 text-[13px] whitespace-nowrap',
                                filters.status === option.value
                                    ? 'bg-active font-semibold text-accent'
                                    : 'text-nav hover:bg-surface',
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {shopping.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted">
                    {filtered
                        ? 'Nenhum item com esses filtros.'
                        : 'Nenhum item nessa loja ainda.'}
                </p>
            ) : (
                <ul className="flex flex-col px-5">
                    {shopping.map((item) => (
                        <ShoppingRow key={item.id} item={item} />
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

            <div className="mb-4" />
        </section>
    );
}

function ShoppingRow({ item }: { item: ShoppingEntry }) {
    return (
        <li className="flex items-center gap-3 border-b py-3">
            <input
                type="checkbox"
                aria-label={`Marcar como comprado: ${item.title}`}
                checked={item.bought}
                // Comprado tem volta (D10): desmarcar tira da fila o que entrou pela compra.
                onChange={() =>
                    router.post(
                        item.bought ? unbuy.url(item.id) : buy.url(item.id),
                        {},
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
                    <BuyMenu item={item} />
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

/**
 * "Comprar ▾": busca pronta em cada loja. No app nativo o link abre no navegador
 * pelo servidor (a janela não abre abas); no navegador, numa aba nova.
 */
function BuyMenu({ item }: { item: ShoppingEntry }) {
    const { native } = usePage().props;
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onPointerDown(event: globalThis.MouseEvent) {
            if (!root.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    function openLink(event: MouseEvent<HTMLAnchorElement>, store?: string) {
        setOpen(false);

        if (native) {
            event.preventDefault();
            router.post(openShopping.url(item.id), store ? { store } : {}, {
                preserveScroll: true,
            });
        }
    }

    const entries = [
        ...(item.saved_link
            ? [
                  {
                      key: 'saved',
                      label: 'Link salvo',
                      url: item.saved_link,
                      store: undefined,
                  },
              ]
            : []),
        ...item.stores.map((store) => ({ ...store, store: store.key })),
    ];

    return (
        <div ref={root} className="relative self-start">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className="text-xs font-semibold text-accent hover:underline"
            >
                Comprar {open ? '▴' : '▾'}
            </button>
            {open && (
                <ul
                    role="menu"
                    className="absolute top-full left-0 z-30 mt-1 w-56 rounded-lg border border-strong bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                >
                    {entries.map((entry) => (
                        <li key={entry.key} role="none">
                            <a
                                role="menuitem"
                                href={entry.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) =>
                                    openLink(event, entry.store)
                                }
                                className="flex items-center justify-between rounded-sm px-3 py-2 text-[13px] text-text hover:bg-elevated"
                            >
                                {entry.label}
                                <span className="text-muted">↗</span>
                            </a>
                        </li>
                    ))}
                    {item.isbn && (
                        <li role="none" className="mt-1 border-t pt-1">
                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    router.post(
                                        lookupPrice.url(item.id),
                                        {},
                                        { preserveScroll: true },
                                    );
                                }}
                                className="flex w-full flex-col items-start rounded-sm px-3 py-2 text-left text-[13px] text-text hover:bg-elevated"
                            >
                                Buscar preço
                                <span className="text-[11px] text-faint">
                                    menor preço na Estante Virtual
                                </span>
                            </button>
                        </li>
                    )}
                    <li
                        role="none"
                        className="px-3 pt-1 pb-1.5 text-[11px] leading-snug text-faint"
                    >
                        {item.isbn
                            ? 'Busca pelo ISBN da edição.'
                            : 'Sem ISBN: busca por título e autor.'}
                    </li>
                </ul>
            )}
        </div>
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
