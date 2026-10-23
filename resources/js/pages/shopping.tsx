import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import {
    Button,
    buttonClass,
    Field,
    IconButton,
    Input,
    Segmented,
    Select,
} from '@/components/form';
import { ClockIcon, PlusIcon } from '@/components/icons';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
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

const STATUS_FILTERS: { value: string; label: TranslationKey }[] = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Por comprar' },
    { value: 'bought', label: 'Comprados' },
];

const SORT_OPTIONS: { value: string; label: TranslationKey }[] = [
    { value: '', label: 'Ordem de adição' },
    { value: 'recent', label: 'Mais recentes' },
    { value: 'title', label: 'Título (A–Z)' },
    { value: 'price_asc', label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
];

const actionButtonClass = 'h-10 px-4 text-[13px]';

export default function Shopping({
    shopping,
    stores,
    filters,
    totals,
    queue_on_buy,
    queue_count,
    matches,
}: ShoppingProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title={t('Compras')}
                description={t('O que comprar e quanto vai custar')}
                actions={
                    <Link
                        href={queueIndex.url()}
                        className={buttonClass(
                            'ghost',
                            cn(actionButtonClass, 'gap-2'),
                        )}
                    >
                        {t('Fila de leitura')}
                        {queue_count > 0 && (
                            <span className="font-mono text-[11px] font-normal text-muted">
                                {t(':count na fila', { count: queue_count })}
                            </span>
                        )}
                    </Link>
                }
            />

            <ShoppingSection
                shopping={shopping}
                stores={stores}
                filters={filters}
                totals={totals}
                queueOnBuy={queue_on_buy}
                matches={matches}
            />
        </div>
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
    const { t, plural, formatBRL } = useTranslation();
    // With a search in progress (?match=), the form comes back open.
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

    // Search with a typing pause: it does not reload on every keystroke.
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
        <>
            <section
                aria-label={t('Resumo')}
                className={cardClass(
                    'flex flex-wrap items-center gap-6 rounded-lg p-6',
                )}
            >
                <div className="flex flex-[1_1_260px] flex-col gap-1.5">
                    <SectionTitle>{t('Lista de compras')}</SectionTitle>
                    <span className="text-5xl leading-none font-extrabold tracking-tighter">
                        {formatBRL(totals.pending_cents)}
                    </span>
                    <span className="text-sm font-semibold text-muted">
                        {t(':items por comprar', {
                            items: plural(
                                totals.pending_count,
                                'item',
                                'itens',
                            ),
                        })}
                    </span>
                </div>
                {/* Saved preference: applies to every purchase until changed. */}
                <button
                    type="button"
                    onClick={() =>
                        router.put(
                            preference.url(),
                            { queue_on_buy: !queueOnBuy },
                            { preserveScroll: true },
                        )
                    }
                    title={t('Clique para alternar')}
                    className="flex flex-col items-start gap-1 rounded-[16px] bg-bg px-4.5 py-3.5 text-left inset-ring inset-ring-strong hover:bg-surface"
                >
                    <span className="text-xs font-bold text-muted">
                        {t('ao comprar:')}
                    </span>
                    <span className="text-[15px] font-extrabold">
                        {queueOnBuy ? t('quero ler + fila') : t('só quero ler')}
                    </span>
                </button>
                <Button
                    aria-expanded={adding}
                    onClick={() => setAdding(!adding)}
                    className="h-11 px-5.5"
                >
                    <PlusIcon />
                    {t('Adicionar item')}
                </Button>
            </section>

            {adding && (
                <ShoppingForm
                    stores={stores}
                    storeFilter={storeFilter}
                    matches={matches}
                    onClose={() => setAdding(false)}
                />
            )}

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div
                    role="tablist"
                    aria-label={t('Onde comprar')}
                    className={cardClass('flex flex-wrap p-1')}
                >
                    {[
                        { value: null, label: t('Todos'), count: allCount },
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
                                    'h-9 rounded-full px-4 text-[13px] font-bold whitespace-nowrap',
                                    selected
                                        ? 'bg-text text-bg'
                                        : 'text-secondary hover:bg-elevated hover:text-text',
                                )}
                            >
                                {store.label}{' '}
                                <span
                                    className={cn(
                                        'font-mono text-[11px] font-normal',
                                        selected ? 'text-bg/70' : 'text-faint',
                                    )}
                                >
                                    {store.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <Input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('Buscar por título ou autor')}
                        aria-label={t('Buscar na lista')}
                        className="w-60"
                    />
                    <Select
                        value={filters.sort ?? ''}
                        onChange={(event) =>
                            filterBy({ sort: event.target.value || null })
                        }
                        aria-label={t('Ordenar')}
                        className="w-auto"
                    >
                        {SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {t(option.label)}
                            </option>
                        ))}
                    </Select>
                    <Segmented
                        options={STATUS_FILTERS.map((option) => ({
                            value: option.value,
                            label: t(option.label),
                        }))}
                        value={filters.status ?? ''}
                        onChange={(value) =>
                            filterBy({ status: value || null })
                        }
                    />
                </div>
            </div>

            {shopping.length === 0 ? (
                <p className="text-[15px] font-semibold text-muted">
                    {filtered
                        ? t('Nenhum item com esses filtros.')
                        : t('Nenhum item nessa loja ainda.')}
                </p>
            ) : (
                <ul className={cardClass('flex flex-col overflow-hidden')}>
                    {shopping.map((item) => (
                        <ShoppingRow key={item.id} item={item} />
                    ))}
                </ul>
            )}
        </>
    );
}

function ShoppingRow({ item }: { item: ShoppingEntry }) {
    const { t } = useTranslation();

    return (
        <li
            className={cn(
                'flex flex-wrap items-center gap-4 border-b px-4.5 py-3.5 last:border-b-0',
                item.bought && 'opacity-55',
            )}
        >
            <button
                type="button"
                role="checkbox"
                aria-checked={item.bought}
                aria-label={t('Marcar como comprado: :title', {
                    title: item.title,
                })}
                // A purchase can be undone: unmarking removes from the queue what entered through it.
                onClick={() =>
                    router.post(
                        item.bought ? unbuy.url(item.id) : buy.url(item.id),
                        {},
                        { preserveScroll: true },
                    )
                }
                className={cn(
                    'size-6.5 shrink-0 rounded-[8px] text-sm font-extrabold text-bg inset-ring-[1.5px]',
                    item.bought
                        ? 'bg-text inset-ring-text'
                        : 'bg-transparent inset-ring-strong hover:inset-ring-secondary',
                )}
            >
                {item.bought && '✓'}
            </button>
            <BookCover
                src={item.cover_url}
                title={item.title}
                className="w-10"
            />
            <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'text-[15px] font-extrabold',
                            item.bought && 'line-through',
                        )}
                    >
                        {item.title}
                    </span>
                    {item.queued && (
                        <span className="inline-flex h-5.5 items-center rounded-full bg-active px-2.5 text-[11px] font-bold text-link">
                            {t('na fila')}
                        </span>
                    )}
                </span>
                <span className="text-[13px] font-medium text-muted">
                    {item.author || t('Autor não informado')} ·{' '}
                    {item.store_label}
                </span>
                {item.bought && (
                    <span className="font-mono text-[11px] text-muted">
                        {t('comprado em :date', { date: item.bought_on ?? '' })}
                    </span>
                )}
            </div>
            <PriceEditor item={item} />
            <div className="flex items-center gap-1.5">
                {!item.bought && <BuyMenu item={item} />}
                {!item.bought && item.isbn && (
                    <Button
                        variant="ghost"
                        title={t('menor preço na Estante Virtual')}
                        onClick={() =>
                            router.post(
                                lookupPrice.url(item.id),
                                {},
                                { preserveScroll: true },
                            )
                        }
                        className={cn(actionButtonClass, 'bg-transparent')}
                    >
                        {t('Buscar preço')}
                    </Button>
                )}
                <IconButton
                    variant="plain"
                    label={t('Excluir :title', { title: item.title })}
                    onClick={() =>
                        router.delete(destroyShopping.url(item.id), {
                            preserveScroll: true,
                        })
                    }
                >
                    ×
                </IconButton>
            </div>
        </li>
    );
}

/**
 * "Buy ▾": a ready-made search in each store. In the native app the link opens in the
 * browser through the server (the window does not open tabs); in the browser, in a new tab.
 */
function BuyMenu({ item }: { item: ShoppingEntry }) {
    const { native } = usePage().props;
    const { t } = useTranslation();
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
                      label: t('Link salvo'),
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
                className={buttonClass('ghost', actionButtonClass)}
            >
                {t('Comprar')} {open ? '▴' : '▾'}
            </button>
            {open && (
                <ul
                    role="menu"
                    className="absolute top-full left-0 z-30 mt-1 w-60 rounded-sm bg-surface p-1 shadow-float"
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
                                className="flex items-center justify-between rounded-[8px] px-3 py-2 text-[13px] font-semibold text-text hover:bg-elevated"
                            >
                                {entry.label}
                                <span className="text-muted">↗</span>
                            </a>
                        </li>
                    ))}
                    <li
                        role="none"
                        className="px-3 pt-1 pb-1.5 text-[11px] leading-snug text-faint"
                    >
                        {item.isbn
                            ? t('Busca pelo ISBN da edição.')
                            : t('Sem ISBN: busca por título e autor.')}
                    </li>
                </ul>
            )}
        </div>
    );
}

/** Noted price, with the date it was checked. Clicking opens editing. */
function PriceEditor({ item }: { item: ShoppingEntry }) {
    const { t, shortDate, formatBRL, locale } = useTranslation();
    const [editing, setEditing] = useState(false);
    const form = useForm({
        estimated_price:
            item.estimated_price_cents === null
                ? ''
                : (item.estimated_price_cents / 100)
                      .toFixed(2)
                      .replace('.', locale === 'en' ? '.' : ','),
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
                    aria-label={t('Preço de :title (R$)', {
                        title: item.title,
                    })}
                    value={form.data.estimated_price}
                    onChange={(event) =>
                        form.setData('estimated_price', event.target.value)
                    }
                    placeholder={t('34,90')}
                    inputMode="decimal"
                    autoFocus
                    className="h-10 w-24 font-mono"
                />
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={form.processing}
                    className={actionButtonClass}
                >
                    {t('Salvar')}
                </Button>
                {form.errors.estimated_price && (
                    <span className="text-xs font-semibold text-danger">
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
            title={t('Atualizar preço')}
            className="flex min-w-27.5 shrink-0 flex-col items-end gap-0.5 rounded-sm px-2 py-1 hover:bg-active disabled:hover:bg-transparent"
        >
            <span className="text-lg font-extrabold">
                {item.estimated_price_cents === null
                    ? t('sem preço')
                    : formatBRL(item.estimated_price_cents)}
            </span>
            {item.price_checked_on && (
                <span
                    className={cn(
                        'flex items-center gap-1 font-mono text-[11px]',
                        item.price_stale ? 'text-warn' : 'text-muted',
                    )}
                >
                    {item.price_stale && <ClockIcon width={10} height={10} />}
                    {item.price_stale
                        ? `${shortDate(item.price_checked_on)} · ${t('conferir')}`
                        : t('em :date', {
                              date: shortDate(item.price_checked_on),
                          })}
                </span>
            )}
        </button>
    );
}

/**
 * New item. The search accepts an ISBN, title or Amazon link and shows the
 * matches; picking one fills the form with title, author, ISBN and cover.
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
    const { t } = useTranslation();
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

        // Pasted link: kept on the item, to open that listing instead of the search.
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
        // The price does not come from the metadata sources: it is the next thing to fill in.
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
        <section
            aria-label={t('Novo item')}
            className={cardClass(
                'flex flex-col gap-3.5 rounded-lg p-6 inset-ring-primary',
            )}
        >
            <div className="flex items-center justify-between">
                <SectionTitle>{t('Novo item')}</SectionTitle>
                <IconButton label={t('Fechar')} onClick={onClose}>
                    ×
                </IconButton>
            </div>

            <form onSubmit={lookUp} className="flex items-end gap-2">
                <Field
                    label={t('ISBN, título ou link da Amazon')}
                    className="flex-1"
                >
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('Cole o link do anúncio ou digite')}
                        className="font-mono"
                    />
                </Field>
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={searching || search.trim() === ''}
                >
                    {searching ? t('Buscando…') : t('Buscar')}
                </Button>
            </form>

            {matches && !searching && (
                <MatchList matches={matches} picked={picked} onPick={pick} />
            )}

            <form
                onSubmit={submit}
                className="grid gap-x-3 gap-y-3.5 sm:grid-cols-2"
            >
                <Field
                    label={t('Título')}
                    className="sm:col-span-2"
                    error={form.errors.title}
                >
                    <Input
                        value={form.data.title}
                        onChange={(event) =>
                            form.setData('title', event.target.value)
                        }
                        placeholder={t('Título do livro')}
                    />
                </Field>
                <Field label={t('Autor')} error={form.errors.author}>
                    <Input
                        value={form.data.author}
                        onChange={(event) =>
                            form.setData('author', event.target.value)
                        }
                    />
                </Field>
                <Field label={t('ISBN (opcional)')} error={form.errors.isbn}>
                    <Input
                        value={form.data.isbn}
                        onChange={(event) =>
                            form.setData('isbn', event.target.value)
                        }
                        inputMode="numeric"
                        className="font-mono"
                    />
                </Field>
                <Field
                    label={t('Link (opcional)')}
                    className="sm:col-span-2"
                    error={form.errors.url}
                >
                    <Input
                        value={form.data.url}
                        onChange={(event) =>
                            form.setData('url', event.target.value)
                        }
                        placeholder={t(
                            'Sem link, o app abre a busca na Amazon pelo ISBN',
                        )}
                        inputMode="url"
                    />
                </Field>
                <fieldset className="flex min-w-0 flex-col">
                    <legend className="pb-1.5 text-xs font-bold text-muted">
                        {t('Onde comprar')}
                    </legend>
                    <Segmented
                        options={stores}
                        value={form.data.store_type}
                        onChange={(value) => form.setData('store_type', value)}
                    />
                    {form.errors.store_type && (
                        <span className="text-xs font-semibold text-danger">
                            {form.errors.store_type}
                        </span>
                    )}
                </fieldset>
                <Field
                    label={t('Preço no anúncio (R$)')}
                    error={form.errors.estimated_price}
                >
                    <Input
                        ref={priceInput}
                        value={form.data.estimated_price}
                        onChange={(event) =>
                            form.setData('estimated_price', event.target.value)
                        }
                        placeholder={t('34,90')}
                        inputMode="decimal"
                        className="font-mono"
                    />
                </Field>
                <Button
                    type="submit"
                    disabled={form.processing || form.data.title.trim() === ''}
                    className="sm:col-span-2 sm:justify-self-start"
                >
                    {t('Adicionar à lista')}
                </Button>
            </form>
        </section>
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
    const { t } = useTranslation();

    if (matches.items.length === 0) {
        return (
            <p className="text-sm text-muted">
                {t(
                    'Nenhuma correspondência para “:query”. Preencha os dados à mão abaixo.',
                    { query: matches.query },
                )}
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-2" aria-label={t('Correspondências')}>
            {matches.items.map((candidate) => {
                const key = candidate.isbn_13 ?? candidate.title;

                return (
                    <li key={key}>
                        <button
                            type="button"
                            onClick={() => onPick(candidate)}
                            aria-pressed={picked === key}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-sm bg-bg p-2 text-left inset-ring inset-ring-border hover:bg-active',
                                picked === key &&
                                    'bg-active inset-ring-primary',
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
                                        t('Autor não informado')}
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
                                    {t('já na biblioteca')}
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
