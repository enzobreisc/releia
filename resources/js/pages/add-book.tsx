import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AmazonCoverField } from '@/components/amazon-cover-field';
import { DatePicker } from '@/components/date-picker';
import { GenreSelect } from '@/components/genre-select';
import { BookCover } from '@/components/book-cover';
import { Field, Input, Segmented, Textarea } from '@/components/form';
import { LibraryIcon, PencilIcon, SearchIcon } from '@/components/icons';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { isBrazilianIsbn, visibleEditions } from '@/lib/editions';
import type { TranslationKey } from '@/lib/i18n';
import { create as addBook, show, store } from '@/routes/books';
import type { Candidate, Editions, Option } from '@/types';

type AddBookProps = {
    query: string;
    publisher: string;
    results: Candidate[];
    editions: Editions | null;
    preview: Candidate | null;
    statuses: Option[];
    genres: string[];
};

type BookForm = {
    title: string;
    subtitle: string;
    authors: string;
    isbn_13: string;
    publisher: string;
    published_year: string;
    pages: string;
    genre: string;
    description: string;
    cover_url: string;
    source: string;
    status: string;
    /** Only for "read": when it was finished. */
    finished_on: string;
    undated: boolean;
};

const emptyForm: BookForm = {
    title: '',
    subtitle: '',
    authors: '',
    isbn_13: '',
    publisher: '',
    published_year: '',
    pages: '',
    genre: '',
    description: '',
    cover_url: '',
    source: 'manual',
    status: 'want_to_read',
    finished_on: '',
    undated: false,
};

function toForm(
    candidate: Candidate,
): Omit<BookForm, 'status' | 'finished_on' | 'undated'> {
    return {
        title: candidate.title,
        subtitle: candidate.subtitle ?? '',
        authors: candidate.authors.join(', '),
        isbn_13: candidate.isbn_13 ?? '',
        publisher: candidate.publisher ?? '',
        published_year: candidate.published_year?.toString() ?? '',
        pages: candidate.pages?.toString() ?? '',
        genre: candidate.genre ?? '',
        description: candidate.description ?? '',
        cover_url: candidate.cover_url ?? '',
        source: candidate.source,
    };
}

const SOURCE_NAMES: Record<string, string> = {
    open_library: 'Open Library',
    google_books: 'Google Books',
    brasil_api: 'BrasilAPI',
};

/** Identifies a result or edition in the list, to mark the selected one. */
function keyOf(candidate: Candidate): string {
    return candidate.isbn_13 ?? `${candidate.work_key}-${candidate.title}`;
}

export default function AddBook({
    query,
    publisher,
    results,
    editions,
    preview,
    statuses,
    genres,
}: AddBookProps) {
    const { t } = useTranslation();
    const [search, setSearch] = useState(query);
    const [publisherFilter, setPublisherFilter] = useState(publisher);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [openWork, setOpenWork] = useState<string | null>(
        editions?.work_key ?? null,
    );
    const [showMore, setShowMore] = useState(false);
    // Manual entry: the review panel opens without a chosen result.
    const [manualMode, setManualMode] = useState(false);
    const form = useForm<BookForm>(emptyForm);

    // The full details (by ISBN) arrive later: they only fill in what is empty.
    useEffect(() => {
        if (!preview || preview.isbn_13 !== form.data.isbn_13) {
            return;
        }

        const details = toForm(preview);

        form.setData((data) => {
            const merged = { ...data };

            for (const key of Object.keys(
                details,
            ) as (keyof typeof details)[]) {
                if (merged[key] === '') {
                    merged[key] = details[key];
                }
            }

            return merged;
        });
    }, [preview]);

    function onSearch(event: FormEvent) {
        event.preventDefault();
        setSelected(null);
        setOpenWork(null);
        router.get(
            addBook.url(),
            {
                q: search.trim() || undefined,
                publisher: publisherFilter.trim() || undefined,
            },
            {
                preserveState: true,
                replace: true,
                onStart: () => setSearching(true),
                onFinish: () => setSearching(false),
                // With a publisher, the edition is what matters: open the first result's editions.
                onSuccess: (page) => {
                    const first = (page.props.results as Candidate[])[0];

                    if (publisherFilter.trim() && first?.work_key) {
                        openEditions(first.work_key);
                    }
                },
            },
        );
    }

    function openEditions(workKey: string) {
        setOpenWork(workKey);
        router.reload({
            only: ['editions'],
            data: { work: workKey },
            replace: true,
        });
    }

    function toggleEditions(workKey: string) {
        if (openWork === workKey) {
            setOpenWork(null);
        } else {
            openEditions(workKey);
        }
    }

    function select(candidate: Candidate) {
        setSelected(keyOf(candidate));
        setManualMode(false);
        form.clearErrors();
        form.setData({
            ...toForm(candidate),
            status: form.data.status,
            finished_on: form.data.finished_on,
            undated: form.data.undated,
        });

        if (candidate.isbn_13) {
            router.reload({
                only: ['preview'],
                data: { isbn: candidate.isbn_13 },
                replace: true,
            });
        }
    }

    function manual() {
        setSelected(null);
        setManualMode(true);
        setShowMore(true);
        form.clearErrors();
        form.setData({
            ...emptyForm,
            title: search.trim(),
            status: form.data.status,
            finished_on: form.data.finished_on,
            undated: form.data.undated,
        });
    }

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(store());
    }

    // ⌘↵ saves from any field, like the button.
    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if (
                event.key === 'Enter' &&
                event.metaKey &&
                (selected !== null || manualMode) &&
                !form.processing
            ) {
                event.preventDefault();
                form.submit(store());
            }
        }

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [selected, manualMode, form]);

    const editing = selected !== null || manualMode;

    return (
        <>
            <PageHeader
                title={t('Adicionar livro')}
                crumb={[t('biblioteca'), t('adicionar')]}
                actions={<Steps current={editing ? 3 : 1} />}
            />

            <form
                role="search"
                onSubmit={onSearch}
                className="flex flex-wrap items-stretch rounded-md border border-primary bg-surface ring-3 ring-primary/20"
            >
                <label className="flex min-w-0 flex-[3_1_260px] items-center gap-3 px-4">
                    <SearchIcon className="shrink-0 text-muted" />
                    <span className="sr-only">{t('ISBN ou título')}</span>
                    <input
                        autoFocus
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={t('ISBN ou título')}
                        className="h-14 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted"
                    />
                </label>
                <label className="flex min-w-0 flex-[1_1_160px] items-center gap-2 border-l px-3.5">
                    <span className="font-mono text-[11px] text-faint">
                        {t('editora:')}
                    </span>
                    <input
                        type="search"
                        value={publisherFilter}
                        onChange={(event) =>
                            setPublisherFilter(event.target.value)
                        }
                        placeholder={t('qualquer')}
                        className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                    />
                </label>
                <button
                    type="submit"
                    disabled={searching || search.trim() === ''}
                    className="m-1.5 flex items-center gap-2 rounded-sm bg-primary px-4.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                    {searching ? t('Buscando…') : t('Buscar')}
                    <span className="font-mono text-[11px] opacity-85">↵</span>
                </button>
            </form>

            <div className="flex flex-wrap items-start gap-7">
                <section
                    aria-label={t('Resultados')}
                    className="flex min-w-0 flex-[1_1_360px] flex-col gap-2.5"
                >
                    {query !== '' && (
                        <>
                            <div className="flex items-baseline justify-between gap-3">
                                <SectionTitle>
                                    {searching
                                        ? t('buscando…')
                                        : t('resultados · :count', {
                                              count: results.length,
                                          })}
                                </SectionTitle>
                                {publisher && (
                                    <span className="font-mono text-[11px] text-faint">
                                        {t('editora:')} {publisher}
                                    </span>
                                )}
                            </div>
                            {results.length > 0 && (
                                <div className="overflow-hidden rounded-md border bg-surface">
                                    {results.map((result, index) => (
                                        <ResultRow
                                            key={`${keyOf(result)}-${index}`}
                                            result={result}
                                            selected={
                                                selected === keyOf(result)
                                            }
                                            onSelect={() => select(result)}
                                            editionsOpen={
                                                openWork === result.work_key
                                            }
                                            onToggleEditions={
                                                result.work_key &&
                                                (result.edition_count ?? 0) > 1
                                                    ? () =>
                                                          toggleEditions(
                                                              result.work_key!,
                                                          )
                                                    : undefined
                                            }
                                        >
                                            {result.work_key &&
                                                openWork ===
                                                    result.work_key && (
                                                    <EditionList
                                                        editions={
                                                            editions?.work_key ===
                                                            result.work_key
                                                                ? editions.items
                                                                : null
                                                        }
                                                        publisher={publisher}
                                                        selected={selected}
                                                        onSelect={(edition) =>
                                                            select({
                                                                ...edition,
                                                                // Editions carry no authors; they come from the work.
                                                                authors:
                                                                    result.authors,
                                                            })
                                                        }
                                                    />
                                                )}
                                        </ResultRow>
                                    ))}
                                </div>
                            )}
                            {!searching && results.length === 0 && (
                                <p className="text-sm text-muted">
                                    {t(
                                        'Nada encontrado na Open Library nem no Google Books.',
                                    )}
                                </p>
                            )}
                        </>
                    )}

                    <button
                        type="button"
                        onClick={manual}
                        className="flex items-center gap-2 self-start py-2.5 text-sm font-semibold text-accent hover:underline"
                    >
                        <PencilIcon />
                        {t('Não achou? Cadastrar à mão')}
                    </button>
                </section>

                <form
                    aria-label={t('Revisar livro')}
                    onSubmit={save}
                    className="flex min-w-0 flex-[1_1_380px] flex-col rounded-md border bg-surface"
                >
                    <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
                        <SectionTitle>{t('revisar')}</SectionTitle>
                        {editing && (
                            <span className="rounded-[4px] bg-elevated px-2 py-0.5 font-mono text-[11px] text-muted">
                                {form.data.source === 'manual'
                                    ? t('manual')
                                    : t('fonte: :source', {
                                          source:
                                              SOURCE_NAMES[form.data.source] ??
                                              form.data.source,
                                      })}
                            </span>
                        )}
                    </div>

                    {editing ? (
                        <div className="flex flex-col gap-4 p-5">
                            <div className="flex gap-4.5">
                                <BookCover
                                    src={form.data.cover_url || null}
                                    title={form.data.title || t('sem capa')}
                                    className="w-26"
                                />
                                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                                    <Field
                                        label={t('Título')}
                                        error={form.errors.title}
                                    >
                                        <Input
                                            required
                                            value={form.data.title}
                                            onChange={(event) =>
                                                form.setData(
                                                    'title',
                                                    event.target.value,
                                                )
                                            }
                                            className="h-10.5 bg-bg text-base font-semibold"
                                        />
                                    </Field>
                                    <Field
                                        label={t('Autor (separe por vírgula)')}
                                        error={form.errors.authors}
                                    >
                                        <Input
                                            value={form.data.authors}
                                            onChange={(event) =>
                                                form.setData(
                                                    'authors',
                                                    event.target.value,
                                                )
                                            }
                                            className="h-10 bg-bg"
                                        />
                                    </Field>
                                </div>
                            </div>

                            <AmazonCoverField
                                onFound={(coverUrl) =>
                                    form.setData('cover_url', coverUrl)
                                }
                            />

                            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                                <Field
                                    label={t('Páginas')}
                                    error={form.errors.pages}
                                >
                                    <Input
                                        type="number"
                                        min={1}
                                        value={form.data.pages}
                                        onChange={(event) =>
                                            form.setData(
                                                'pages',
                                                event.target.value,
                                            )
                                        }
                                        className="h-10 bg-bg font-mono"
                                    />
                                </Field>
                                <div className="flex flex-col gap-1.5 text-[13px] text-muted">
                                    <span>{t('Gênero')}</span>
                                    <GenreSelect
                                        value={form.data.genre}
                                        onChange={(value) =>
                                            form.setData('genre', value)
                                        }
                                        genres={genres}
                                    />
                                    {form.errors.genre && (
                                        <span className="text-xs text-red-300">
                                            {form.errors.genre}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5 border-t pt-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowMore(!showMore)}
                                    aria-expanded={showMore}
                                    className="self-start font-mono text-xs text-accent hover:underline"
                                >
                                    {showMore ? '−' : '+'}{' '}
                                    {t('editora, ano, ISBN e descrição')}
                                </button>
                                {showMore && <MoreFields form={form} />}
                            </div>

                            <fieldset className="flex flex-col gap-1.5">
                                <legend className="pb-1.5 text-xs text-muted">
                                    {t('Estante')}
                                </legend>
                                <Segmented
                                    options={statuses}
                                    value={form.data.status}
                                    onChange={(value) =>
                                        form.setData((data) => ({
                                            ...data,
                                            status: value,
                                            finished_on:
                                                value === 'read' &&
                                                data.finished_on === ''
                                                    ? today()
                                                    : data.finished_on,
                                        }))
                                    }
                                />
                                {form.errors.status && (
                                    <span className="text-xs text-danger">
                                        {form.errors.status}
                                    </span>
                                )}
                                {form.data.status === 'read' && (
                                    <div className="mt-1.5 flex flex-col gap-1.5">
                                        <span className="text-[13px] text-muted">
                                            {t('Terminou em')}
                                        </span>
                                        <div className="max-w-52">
                                            <DatePicker
                                                aria-label={t(
                                                    'Data de término',
                                                )}
                                                max={today()}
                                                disabled={form.data.undated}
                                                value={
                                                    form.data.undated
                                                        ? ''
                                                        : form.data.finished_on
                                                }
                                                onChange={(value) =>
                                                    form.setData(
                                                        'finished_on',
                                                        value,
                                                    )
                                                }
                                                className="h-10 bg-bg"
                                            />
                                        </div>
                                        <label className="flex items-center gap-2 text-xs text-muted">
                                            <input
                                                type="checkbox"
                                                checked={form.data.undated}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'undated',
                                                        event.target.checked,
                                                    )
                                                }
                                                className="accent-primary"
                                            />
                                            {t(
                                                'Não lembro / sem data de término',
                                            )}
                                        </label>
                                        {form.errors.finished_on && (
                                            <span className="text-xs text-danger">
                                                {form.errors.finished_on}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </fieldset>
                        </div>
                    ) : (
                        <div className="m-5 flex min-h-75 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center">
                            <LibraryIcon
                                width={28}
                                height={28}
                                className="text-faint"
                            />
                            <p className="text-sm font-semibold">
                                {t('Nenhum livro escolhido')}
                            </p>
                            <p className="text-[13px] text-muted">
                                {t(
                                    'Escolha um resultado ao lado ou cadastre à mão.',
                                )}
                            </p>
                        </div>
                    )}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-b-md border-t bg-[#0d131c] px-5 py-3.5">
                        <span className="text-xs text-muted">
                            {t('Tudo pode ser editado antes de salvar.')}
                        </span>
                        <button
                            type="submit"
                            disabled={!editing || form.processing}
                            className="flex items-center gap-2.5 rounded-sm bg-primary px-4.5 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                        >
                            {form.processing
                                ? t('Salvando…')
                                : t('Salvar na biblioteca')}
                            <span className="font-mono text-[11px] opacity-85">
                                ⌘↵
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

/** Steps of the flow: search → pick an edition → review and save. */
function Steps({ current }: { current: number }) {
    const { t } = useTranslation();
    const steps: TranslationKey[] = [
        'buscar',
        'escolher edição',
        'revisar e salvar',
    ];

    return (
        <ol
            aria-label={t('Etapas')}
            className="flex flex-wrap items-center gap-2.5 font-mono text-xs"
        >
            {steps.map((label, index) => {
                const done = index + 1 <= current;

                return (
                    <li
                        key={label}
                        aria-current={
                            index + 1 === current ? 'step' : undefined
                        }
                        className={cn(
                            'flex items-center gap-1.5',
                            done ? 'text-accent' : 'text-faint',
                        )}
                    >
                        {index > 0 && (
                            <span
                                aria-hidden="true"
                                className="mr-1 text-faint"
                            >
                                ──
                            </span>
                        )}
                        <span
                            className={cn(
                                'inline-flex size-5 items-center justify-center rounded-[4px] border',
                                done
                                    ? 'border-primary bg-active'
                                    : 'bg-surface',
                            )}
                        >
                            {index + 1}
                        </span>
                        {t(label)}
                    </li>
                );
            })}
        </ol>
    );
}

function ResultRow({
    result,
    selected,
    onSelect,
    editionsOpen,
    onToggleEditions,
    children,
}: {
    result: Candidate;
    selected: boolean;
    onSelect: () => void;
    editionsOpen: boolean;
    onToggleEditions?: () => void;
    children?: ReactNode;
}) {
    const { t } = useTranslation();
    const meta = [
        result.authors.join(', ') || t('Autor desconhecido'),
        result.published_year,
        result.publisher,
    ].filter(Boolean);

    return (
        <div
            className={cn(
                'border-b last:border-b-0',
                selected &&
                    'bg-active shadow-[inset_2px_0_0_var(--color-primary)]',
            )}
        >
            <div className="flex items-center gap-3.5 px-3.5 py-3">
                <BookCover
                    src={result.cover_url}
                    title={result.title}
                    className="w-11"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="line-clamp-2 text-[15px] font-semibold">
                        {result.title}
                    </div>
                    <div className="line-clamp-1 text-[13px] text-muted">
                        {meta.join(' · ')}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                        {onToggleEditions && (
                            <button
                                type="button"
                                onClick={onToggleEditions}
                                aria-expanded={editionsOpen}
                                className="rounded-[4px] border bg-bg px-2 py-0.5 font-mono text-[11px] text-accent hover:bg-active"
                            >
                                {editionsOpen ? '−' : '+'}{' '}
                                {t(':count edições', {
                                    count: result.edition_count ?? 0,
                                })}
                            </button>
                        )}
                        {result.isbn_13 && (
                            <span className="py-0.5 font-mono text-[11px] text-faint">
                                ISBN {result.isbn_13}
                            </span>
                        )}
                        {result.library_id !== null && (
                            <span className="rounded-[4px] bg-elevated px-2 py-0.5 font-mono text-[11px] text-muted">
                                {t('já na biblioteca')}
                            </span>
                        )}
                    </div>
                </div>
                {result.library_id ? (
                    <Link
                        href={show.url(result.library_id)}
                        className="shrink-0 rounded-sm border px-3.5 py-2.5 text-[13px] text-accent hover:bg-active"
                    >
                        {t('Abrir')}
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={onSelect}
                        aria-pressed={selected}
                        className={cn(
                            'shrink-0 rounded-sm border px-3.5 py-2.5 text-[13px] font-semibold',
                            selected
                                ? 'border-primary bg-primary text-white'
                                : 'hover:bg-active',
                        )}
                    >
                        {selected ? t('✓ Escolhido') : t('Escolher')}
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function EditionList({
    editions,
    publisher,
    selected,
    onSelect,
}: {
    editions: Candidate[] | null;
    publisher: string;
    selected: string | null;
    onSelect: (edition: Candidate) => void;
}) {
    const { t, plural } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const [expanded, setExpanded] = useState(false);

    if (editions === null) {
        return (
            <p className="mb-3 ml-18 font-mono text-xs text-muted">
                {t('carregando edições…')}
            </p>
        );
    }

    if (editions.length === 0) {
        return (
            <p className="mb-3 ml-18 text-sm text-muted">
                {publisher
                    ? t('Nenhuma edição com ISBN da editora ":publisher".', {
                          publisher,
                      })
                    : t('Nenhuma edição com ISBN.')}
            </p>
        );
    }

    // Brazilian ones first and alone, without duplicates; with none, the others.
    const {
        items: visible,
        foreign,
        more,
    } = visibleEditions(editions, { showForeign: showAll, expanded });

    return (
        <ul
            aria-label={t('Edições')}
            className="mr-3.5 mb-3 ml-18 flex max-h-96 flex-col gap-1 overflow-y-auto border-l pl-3"
        >
            {visible.map((edition) => {
                const isSelected = selected === keyOf(edition);
                const meta = [
                    edition.published_year,
                    edition.pages &&
                        t(':pages págs.', { pages: edition.pages }),
                ].filter(Boolean);

                return (
                    <li key={keyOf(edition)}>
                        {edition.library_id ? (
                            <Link
                                href={show.url(edition.library_id)}
                                className="flex items-center gap-2.5 rounded-sm border bg-bg px-2.5 py-2 hover:bg-active"
                            >
                                <EditionLabel edition={edition} meta={meta} />
                                <span className="font-mono text-[11px] text-accent">
                                    {t('na biblioteca')}
                                </span>
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onSelect(edition)}
                                aria-pressed={isSelected}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-sm border bg-bg px-2.5 py-2 text-left hover:bg-active',
                                    isSelected && 'border-primary',
                                )}
                            >
                                <EditionLabel edition={edition} meta={meta} />
                            </button>
                        )}
                    </li>
                );
            })}
            {foreign > 0 && (
                <li>
                    <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="text-xs text-accent hover:underline"
                    >
                        {t('+ Mostrar :editions de outros países', {
                            editions: plural(foreign, 'edição', 'edições'),
                        })}
                    </button>
                </li>
            )}
            {more > 0 && (
                <li>
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="text-xs text-accent hover:underline"
                    >
                        {t('+ Mostrar mais :count', { count: more })}
                    </button>
                </li>
            )}
        </ul>
    );
}

function EditionLabel({
    edition,
    meta,
}: {
    edition: Candidate;
    meta: (string | number | null | undefined)[];
}) {
    return (
        <>
            <span className="min-w-0 flex-1 text-[13px]">
                {edition.publisher ?? edition.title}
                {meta.length > 0 && (
                    <span className="text-muted"> · {meta.join(' · ')}</span>
                )}
            </span>
            {isBrazilianIsbn(edition.isbn_13) && (
                <span className="rounded-[4px] bg-active px-1.5 py-px font-mono text-[10px] text-accent">
                    pt-BR
                </span>
            )}
            <span className="font-mono text-[11px] text-faint">
                {edition.isbn_13}
            </span>
        </>
    );
}

function MoreFields({ form }: { form: ReturnType<typeof useForm<BookForm>> }) {
    const { t } = useTranslation();

    return (
        <>
            <Field label={t('Subtítulo')} error={form.errors.subtitle}>
                <Input
                    value={form.data.subtitle}
                    onChange={(event) =>
                        form.setData('subtitle', event.target.value)
                    }
                    className="h-10"
                />
            </Field>
            <div className="flex flex-wrap gap-3">
                <Field
                    label={t('Editora')}
                    error={form.errors.publisher}
                    className="flex-[2_1_160px]"
                >
                    <Input
                        value={form.data.publisher}
                        onChange={(event) =>
                            form.setData('publisher', event.target.value)
                        }
                        className="h-10"
                    />
                </Field>
                <Field
                    label={t('Ano')}
                    error={form.errors.published_year}
                    className="flex-[1_1_80px]"
                >
                    <Input
                        type="number"
                        value={form.data.published_year}
                        onChange={(event) =>
                            form.setData('published_year', event.target.value)
                        }
                        className="h-10"
                    />
                </Field>
            </div>
            <Field label="ISBN" error={form.errors.isbn_13}>
                <Input
                    value={form.data.isbn_13}
                    onChange={(event) =>
                        form.setData('isbn_13', event.target.value)
                    }
                    className="h-10 font-mono"
                />
            </Field>
            <Field label={t('Descrição')} error={form.errors.description}>
                <Textarea
                    value={form.data.description}
                    onChange={(event) =>
                        form.setData('description', event.target.value)
                    }
                />
            </Field>
        </>
    );
}
