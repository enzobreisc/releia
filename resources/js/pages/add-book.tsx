import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AmazonCoverField } from '@/components/amazon-cover-field';
import { DatePicker } from '@/components/date-picker';
import { GenreSelect } from '@/components/genre-select';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import {
    Button,
    buttonClass,
    Field,
    Input,
    Segmented,
    Textarea,
} from '@/components/form';
import { LibraryIcon } from '@/components/icons';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { isBrazilianIsbn, visibleEditions } from '@/lib/editions';
import type { TranslationKey } from '@/lib/i18n';
import { index as libraryIndex } from '@/routes/library';
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
    const [manualMode, setManualMode] = useState(false);
    const form = useForm<BookForm>(emptyForm);

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
            <Link
                href={libraryIndex.url()}
                className="-mb-3 self-start text-[13px] font-semibold text-secondary hover:text-text"
            >
                {t('Biblioteca')}
                <span className="text-muted"> / {t('adicionar')}</span>
            </Link>
            <PageHeader
                title={t('Adicionar livro')}
                actions={<Steps current={editing ? 3 : 1} />}
            />

            <div className="flex flex-wrap items-start gap-7">
                <section
                    aria-label={t('Resultados')}
                    className="flex min-w-0 flex-[3_1_480px] flex-col gap-4.5"
                >
                    <form
                        role="search"
                        onSubmit={onSearch}
                        className="flex flex-wrap items-end gap-2.5"
                    >
                        <Field
                            label={t('ISBN ou título')}
                            className="flex-[3_1_260px]"
                        >
                            <Input
                                autoFocus
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label={t('editora:')}
                            className="flex-[1_1_150px]"
                        >
                            <Input
                                type="search"
                                value={publisherFilter}
                                onChange={(event) =>
                                    setPublisherFilter(event.target.value)
                                }
                                placeholder={t('qualquer')}
                            />
                        </Field>
                        <Button
                            type="submit"
                            disabled={searching || search.trim() === ''}
                            className="px-5.5"
                        >
                            {searching ? t('Buscando…') : t('Buscar')}
                        </Button>
                    </form>

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
                                    <span className="font-mono text-[11px] text-muted">
                                        {t('editora:')} {publisher}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={manual}
                                    className="text-[13px] font-bold text-link hover:text-text"
                                >
                                    {t('Não achou? Cadastrar à mão')}
                                </button>
                            </div>
                            {results.length > 0 && (
                                <div className="flex flex-col gap-2.5">
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

                    {query === '' && (
                        <button
                            type="button"
                            onClick={manual}
                            className="self-start text-[13px] font-bold text-link hover:text-text"
                        >
                            {t('Não achou? Cadastrar à mão')}
                        </button>
                    )}
                </section>

                <form
                    aria-label={t('Revisar livro')}
                    onSubmit={save}
                    className={cardClass(
                        'flex min-w-0 flex-[2_1_340px] flex-col gap-4.5 rounded-lg p-6',
                    )}
                >
                    <div className="flex items-baseline justify-between gap-3">
                        <SectionTitle>{t('Revisar livro')}</SectionTitle>
                        {editing && (
                            <span className="font-mono text-[11px] text-muted">
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
                        <>
                            <div className="flex items-end gap-5">
                                <BookCover
                                    src={form.data.cover_url || null}
                                    title={form.data.title || t('sem capa')}
                                    className="w-32"
                                />
                                <div className="flex min-w-0 flex-col gap-1.5 pb-1">
                                    <span className="text-[26px] leading-none font-extrabold tracking-tight">
                                        {form.data.title}
                                    </span>
                                    <span className="text-sm font-semibold text-secondary">
                                        {form.data.authors}
                                    </span>
                                </div>
                            </div>

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
                                />
                            </Field>

                            <AmazonCoverField
                                onFound={(coverUrl) =>
                                    form.setData('cover_url', coverUrl)
                                }
                            />

                            <div className="flex gap-2.5">
                                <Field
                                    label={t('Páginas')}
                                    error={form.errors.pages}
                                    className="flex-1"
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
                                        className="min-w-0 font-mono"
                                    />
                                </Field>
                                <div className="flex flex-[2_1_0] flex-col gap-1.5 text-xs font-bold text-muted">
                                    <span>{t('Gênero')}</span>
                                    <GenreSelect
                                        value={form.data.genre}
                                        onChange={(value) =>
                                            form.setData('genre', value)
                                        }
                                        genres={genres}
                                    />
                                    {form.errors.genre && (
                                        <span className="text-xs font-semibold text-danger">
                                            {form.errors.genre}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowMore(!showMore)}
                                    aria-expanded={showMore}
                                    className="self-start text-[13px] font-bold text-link hover:text-text"
                                >
                                    {showMore ? '−' : '+'}{' '}
                                    {t('editora, ano, ISBN e descrição')}
                                </button>
                                {showMore && <MoreFields form={form} />}
                            </div>

                            <fieldset className="flex flex-col gap-1.5">
                                <legend className="pb-1.5 text-xs font-bold text-muted">
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
                                        <span className="text-xs font-bold text-muted">
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
                                                className="h-11"
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
                                                className="accent-accent"
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
                        </>
                    ) : (
                        <div className="flex min-h-75 flex-col items-center justify-center gap-2 p-6 text-center">
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

                    <span className="text-[13px] font-medium text-muted">
                        {t('Tudo pode ser editado antes de salvar.')}
                    </span>
                    <Button
                        type="submit"
                        disabled={!editing || form.processing}
                        className="h-12 text-sm"
                    >
                        {form.processing
                            ? t('Salvando…')
                            : t('Salvar na biblioteca')}
                        <span className="font-mono text-[11px] font-normal opacity-70">
                            ⌘↵
                        </span>
                    </Button>
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
            className="flex flex-wrap rounded-full bg-surface p-1 inset-ring inset-ring-border"
        >
            {steps.map((label, index) => {
                const active = index + 1 === current;

                return (
                    <li
                        key={label}
                        aria-current={active ? 'step' : undefined}
                        className={cn(
                            'flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-bold',
                            active ? 'bg-text text-bg' : 'text-secondary',
                        )}
                    >
                        <span className="font-mono text-[11px] font-normal">
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
        <article
            className={cardClass(
                selected ? 'bg-active inset-ring-primary' : undefined,
            )}
        >
            <div className="flex items-center gap-4 px-4 py-3.5">
                <BookCover
                    src={result.cover_url}
                    title={result.title}
                    className="w-12"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                    <span className="line-clamp-2 text-base font-extrabold">
                        {result.title}
                    </span>
                    <span className="line-clamp-1 text-[13px] font-medium text-muted">
                        {meta.join(' · ')}
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted">
                        {result.isbn_13 && <span>ISBN {result.isbn_13}</span>}
                        {result.library_id !== null && (
                            <span className="text-link">
                                {t('já na biblioteca')}
                            </span>
                        )}
                    </span>
                </div>
                <div className="flex gap-2">
                    {onToggleEditions && (
                        <button
                            type="button"
                            onClick={onToggleEditions}
                            aria-expanded={editionsOpen}
                            className={buttonClass(
                                'ghost',
                                'h-10 bg-transparent px-4 text-[13px]',
                            )}
                        >
                            {editionsOpen ? '−' : '+'}{' '}
                            {t(':count edições', {
                                count: result.edition_count ?? 0,
                            })}
                        </button>
                    )}
                    {result.library_id ? (
                        <Link
                            href={show.url(result.library_id)}
                            className={buttonClass(
                                'ghost',
                                'h-10 px-4 text-[13px]',
                            )}
                        >
                            {t('Abrir')}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={onSelect}
                            aria-pressed={selected}
                            className={buttonClass(
                                selected ? 'outline' : 'ghost',
                                'h-10 px-4 text-[13px]',
                            )}
                        >
                            {selected ? t('✓ Escolhido') : t('Escolher')}
                        </button>
                    )}
                </div>
            </div>
            {children}
        </article>
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
            <p className="px-4 pb-3 font-mono text-xs text-muted">
                {t('carregando edições…')}
            </p>
        );
    }

    if (editions.length === 0) {
        return (
            <p className="px-4 pb-3 text-sm text-muted">
                {publisher
                    ? t('Nenhuma edição com ISBN da editora ":publisher".', {
                          publisher,
                      })
                    : t('Nenhuma edição com ISBN.')}
            </p>
        );
    }

    const {
        items: visible,
        foreign,
        more,
    } = visibleEditions(editions, { showForeign: showAll, expanded });

    return (
        <ul
            aria-label={t('Edições')}
            className="mx-4 mb-3 flex max-h-96 flex-col overflow-y-auto"
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
                                className="flex items-center gap-3 border-t py-2.5 hover:bg-active"
                            >
                                <EditionLabel edition={edition} meta={meta} />
                                <span className="font-mono text-[11px] text-link">
                                    {t('na biblioteca')}
                                </span>
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onSelect(edition)}
                                aria-pressed={isSelected}
                                className={cn(
                                    'flex w-full items-center gap-3 border-t py-2.5 text-left hover:bg-active',
                                    isSelected && 'text-link',
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
                        className="py-2.5 text-[13px] font-bold text-secondary hover:text-text"
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
                        className="py-2.5 text-[13px] font-bold text-secondary hover:text-text"
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
            <span className="min-w-0 flex-1 text-[13px] font-bold">
                {edition.publisher ?? edition.title}
                {meta.length > 0 && (
                    <span className="font-mono text-xs font-normal text-muted">
                        {' '}
                        · {meta.join(' · ')}
                    </span>
                )}
            </span>
            {isBrazilianIsbn(edition.isbn_13) && (
                <span className="font-mono text-[11px] text-link">pt-BR</span>
            )}
            <span className="font-mono text-xs text-muted">
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
                    />
                </Field>
            </div>
            <Field label="ISBN" error={form.errors.isbn_13}>
                <Input
                    value={form.data.isbn_13}
                    onChange={(event) =>
                        form.setData('isbn_13', event.target.value)
                    }
                    className="font-mono"
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
