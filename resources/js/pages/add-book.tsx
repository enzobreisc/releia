import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Field, Input, Select, Textarea } from '@/components/form';
import { SearchIcon } from '@/components/icons';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { create as addBook, show, store } from '@/routes/books';
import type { Candidate, Editions, Option } from '@/types';

type AddBookProps = {
    query: string;
    publisher: string;
    results: Candidate[];
    editions: Editions | null;
    preview: Candidate | null;
    statuses: Option[];
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
};

function toForm(candidate: Candidate): Omit<BookForm, 'status'> {
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

const SOURCE_LABELS: Record<string, string> = {
    open_library: 'Open Library',
    google_books: 'Google Books',
    manual: 'cadastro manual',
};

/** Identifica um resultado ou edição na lista, para marcar o selecionado. */
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
}: AddBookProps) {
    const [search, setSearch] = useState(query);
    const [publisherFilter, setPublisherFilter] = useState(publisher);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [openWork, setOpenWork] = useState<string | null>(
        editions?.work_key ?? null,
    );
    const [showMore, setShowMore] = useState(false);
    const form = useForm<BookForm>(emptyForm);

    // Os detalhes completos (por ISBN) chegam depois: completam só o que está vazio.
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
                // Com editora, o que interessa é a edição: abre as do primeiro resultado.
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
        form.clearErrors();
        form.setData({ ...toForm(candidate), status: form.data.status });

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
        setShowMore(true);
        form.clearErrors();
        form.setData({
            ...emptyForm,
            title: search.trim(),
            status: form.data.status,
        });
    }

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(store());
    }

    return (
        <>
            <PageHeader
                title="Adicionar livro"
                crumb={['biblioteca', 'adicionar']}
            />

            <div className="flex flex-wrap items-start gap-8">
                <section className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
                    <form
                        onSubmit={onSearch}
                        className="flex flex-wrap items-end gap-2"
                    >
                        <Field
                            label="Buscar por ISBN ou título"
                            className="flex-[2_1_200px]"
                        >
                            <Input
                                autoFocus
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Digite o ISBN ou o título"
                                className="h-12 text-base"
                            />
                        </Field>
                        <Field
                            label="Editora (opcional)"
                            className="flex-[1_1_140px]"
                        >
                            <Input
                                type="search"
                                value={publisherFilter}
                                onChange={(event) =>
                                    setPublisherFilter(event.target.value)
                                }
                                placeholder="Ex.: Penguin"
                                className="h-12 text-base"
                            />
                        </Field>
                        <Button
                            type="submit"
                            disabled={searching || search.trim() === ''}
                            aria-label="Buscar"
                            className="h-12"
                        >
                            <SearchIcon />
                        </Button>
                    </form>

                    {query !== '' && (
                        <>
                            <SectionTitle>
                                {searching
                                    ? 'buscando…'
                                    : `resultados · ${results.length}`}
                            </SectionTitle>
                            <div className="flex flex-col gap-2.5">
                                {results.map((result, index) => (
                                    <div
                                        key={`${keyOf(result)}-${index}`}
                                        className="flex flex-col gap-2"
                                    >
                                        <ResultRow
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
                                        />
                                        {result.work_key &&
                                            openWork === result.work_key && (
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
                                                            // As edições não trazem autores; vêm da obra.
                                                            authors:
                                                                result.authors,
                                                        })
                                                    }
                                                />
                                            )}
                                    </div>
                                ))}
                                {!searching && results.length === 0 && (
                                    <p className="text-sm text-muted">
                                        Nada encontrado na Open Library nem no
                                        Google Books.
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={manual}
                        className="self-start text-sm font-semibold text-accent hover:underline"
                    >
                        Não achou? Cadastrar manualmente
                    </button>
                </section>

                <form
                    onSubmit={save}
                    className="flex min-w-0 flex-[1_1_340px] flex-col gap-4 rounded-md border bg-surface p-6"
                >
                    <SectionTitle>pré-visualização</SectionTitle>

                    <div className="flex gap-5">
                        <BookCover
                            src={form.data.cover_url || null}
                            title={form.data.title || 'sem capa'}
                            className="w-27.5"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                            <Field label="Título" error={form.errors.title}>
                                <Input
                                    required
                                    value={form.data.title}
                                    onChange={(event) =>
                                        form.setData(
                                            'title',
                                            event.target.value,
                                        )
                                    }
                                    className="h-10"
                                />
                            </Field>
                            <Field
                                label="Autor (separe por vírgula)"
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
                                    className="h-10"
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Field
                            label="Páginas"
                            error={form.errors.pages}
                            className="flex-[1_1_120px]"
                        >
                            <Input
                                type="number"
                                min={1}
                                value={form.data.pages}
                                onChange={(event) =>
                                    form.setData('pages', event.target.value)
                                }
                                className="h-10"
                            />
                        </Field>
                        <Field
                            label="Gênero"
                            error={form.errors.genre}
                            className="flex-[1_1_120px]"
                        >
                            <Input
                                value={form.data.genre}
                                onChange={(event) =>
                                    form.setData('genre', event.target.value)
                                }
                                className="h-10"
                            />
                        </Field>
                    </div>

                    {showMore ? (
                        <MoreFields form={form} />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowMore(true)}
                            className="self-start font-mono text-xs text-accent hover:underline"
                        >
                            + editora, ano, ISBN e descrição
                        </button>
                    )}

                    <Field label="Estante" error={form.errors.status}>
                        <Select
                            value={form.data.status}
                            onChange={(event) =>
                                form.setData('status', event.target.value)
                            }
                        >
                            {statuses.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <p className="text-xs text-muted">
                        Dados de{' '}
                        {SOURCE_LABELS[form.data.source] ?? form.data.source}.
                        Tudo pode ser editado antes de salvar.
                    </p>

                    <Button
                        type="submit"
                        disabled={form.processing}
                        className="h-12 text-[15px]"
                    >
                        {form.processing ? 'Salvando…' : 'Salvar na biblioteca'}
                    </Button>
                </form>
            </div>
        </>
    );
}

function ResultRow({
    result,
    selected,
    onSelect,
    editionsOpen,
    onToggleEditions,
}: {
    result: Candidate;
    selected: boolean;
    onSelect: () => void;
    editionsOpen: boolean;
    onToggleEditions?: () => void;
}) {
    const meta = [
        result.authors.join(', ') || 'Autor desconhecido',
        result.published_year,
        result.publisher,
    ].filter(Boolean);

    return (
        <div
            className={cn(
                'flex items-center gap-3.5 rounded-[10px] border bg-surface p-3',
                selected && 'border-primary',
            )}
        >
            <BookCover
                src={result.cover_url}
                title={result.title}
                className="w-12"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="line-clamp-2 text-[15px] font-semibold">
                    {result.title}
                </div>
                <div className="line-clamp-1 text-[13px] text-muted">
                    {meta.join(' · ')}
                </div>
                {result.isbn_13 && (
                    <div className="font-mono text-[11px] text-faint">
                        ISBN {result.isbn_13}
                    </div>
                )}
                {onToggleEditions && (
                    <button
                        type="button"
                        onClick={onToggleEditions}
                        aria-expanded={editionsOpen}
                        className="self-start font-mono text-xs text-accent hover:underline"
                    >
                        {editionsOpen ? '−' : '+'} {result.edition_count}{' '}
                        edições
                    </button>
                )}
            </div>
            {result.library_id ? (
                <Link
                    href={show.url(result.library_id)}
                    className="shrink-0 rounded-sm border px-3.5 py-2.5 text-[13px] text-accent hover:bg-active"
                >
                    Na biblioteca
                </Link>
            ) : (
                <button
                    type="button"
                    onClick={onSelect}
                    className="shrink-0 rounded-sm border px-3.5 py-2.5 text-[13px] hover:bg-active"
                >
                    {selected ? 'Selecionado' : 'Selecionar'}
                </button>
            )}
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
    if (editions === null) {
        return (
            <p className="ml-6 font-mono text-xs text-muted">
                carregando edições…
            </p>
        );
    }

    if (editions.length === 0) {
        return (
            <p className="ml-6 text-sm text-muted">
                {publisher
                    ? `Nenhuma edição com ISBN da editora "${publisher}".`
                    : 'Nenhuma edição com ISBN.'}
            </p>
        );
    }

    return (
        <ul
            aria-label="Edições"
            className="ml-6 flex max-h-96 flex-col gap-1.5 overflow-y-auto border-l pl-3"
        >
            {editions.map((edition) => {
                const isSelected = selected === keyOf(edition);
                const meta = [
                    edition.publisher,
                    edition.published_year,
                    edition.pages && `${edition.pages} págs.`,
                ].filter(Boolean);

                return (
                    <li
                        key={keyOf(edition)}
                        className={cn(
                            'flex items-center gap-3 rounded-sm border bg-surface p-2',
                            isSelected && 'border-primary',
                        )}
                    >
                        <BookCover
                            src={edition.cover_url}
                            title={edition.title}
                            className="w-9"
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="line-clamp-1 text-[13px]">
                                {meta.join(' · ') || edition.title}
                            </div>
                            <div className="font-mono text-[11px] text-faint">
                                {edition.language && `${edition.language} · `}
                                ISBN {edition.isbn_13}
                            </div>
                        </div>
                        {edition.library_id ? (
                            <Link
                                href={show.url(edition.library_id)}
                                className="shrink-0 rounded-sm border px-3 py-2 text-xs text-accent hover:bg-active"
                            >
                                Na biblioteca
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onSelect(edition)}
                                className="shrink-0 rounded-sm border px-3 py-2 text-xs hover:bg-active"
                            >
                                {isSelected ? 'Selecionada' : 'Selecionar'}
                            </button>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

function MoreFields({ form }: { form: ReturnType<typeof useForm<BookForm>> }) {
    return (
        <>
            <Field label="Subtítulo" error={form.errors.subtitle}>
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
                    label="Editora"
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
                    label="Ano"
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
            <Field label="Descrição" error={form.errors.description}>
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
