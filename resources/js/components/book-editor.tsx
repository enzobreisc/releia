import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Button, Field, Input, Textarea } from '@/components/form';
import { cn } from '@/lib/utils';
import { show, update } from '@/routes/books';
import type { BookDetail, Candidate } from '@/types';

type Fields = {
    title: string;
    subtitle: string;
    authors: string[];
    pages: string;
    genre: string;
    publisher: string;
    published_year: string;
    isbn_13: string;
    description: string;
    cover_url: string;
    cover_file: File | null;
};

type Diff = {
    key:
        | 'title'
        | 'subtitle'
        | 'authors'
        | 'pages'
        | 'publisher'
        | 'published_year'
        | 'genre'
        | 'description'
        | 'cover_url';
    label: string;
    from: string;
    to: string;
};

function initialFields(book: BookDetail): Fields {
    return {
        title: book.title,
        subtitle: book.subtitle ?? '',
        authors: book.authors
            ? book.authors
                  .split(',')
                  .map((name) => name.trim())
                  .filter(Boolean)
            : [],
        pages: book.pages?.toString() ?? '',
        genre: book.genre ?? '',
        publisher: book.publisher ?? '',
        published_year: book.published_year?.toString() ?? '',
        isbn_13: book.isbn_13 ?? '',
        description: book.description ?? '',
        cover_url: '',
        cover_file: null,
    };
}

/** O que a fonte tem de diferente do que está salvo. */
function diffsFrom(fields: Fields, candidate: Candidate): Diff[] {
    const pairs: [Diff['key'], string, string, string | null][] = [
        ['title', 'título', fields.title, candidate.title],
        ['subtitle', 'subtítulo', fields.subtitle, candidate.subtitle],
        [
            'authors',
            'autores',
            fields.authors.join(', '),
            candidate.authors.join(', '),
        ],
        ['pages', 'páginas', fields.pages, candidate.pages?.toString() ?? null],
        ['publisher', 'editora', fields.publisher, candidate.publisher],
        [
            'published_year',
            'ano',
            fields.published_year,
            candidate.published_year?.toString() ?? null,
        ],
        ['genre', 'gênero', fields.genre, candidate.genre],
        ['description', 'sinopse', fields.description, candidate.description],
        [
            'cover_url',
            'capa',
            'atual',
            candidate.cover_url ? 'nova da fonte' : null,
        ],
    ];

    return pairs
        .filter(([, , from, to]) => to !== null && to !== '' && to !== from)
        .map(([key, label, from, to]) => ({
            key,
            label,
            from: from === '' ? '(vazio)' : from,
            to: to!,
        }));
}

/**
 * Painel "editar dados" (gaveta à direita). Corrige o que veio errado do cadastro:
 * título, autores, páginas, capa… Esc com alterações pede para descartar ali mesmo.
 */
export function BookEditor({
    book,
    genres,
    lookup,
    onClose,
    onShowSessions,
}: {
    book: BookDetail;
    genres: string[];
    lookup: Candidate | null | undefined;
    onClose: () => void;
    onShowSessions: () => void;
}) {
    const initial = useRef(initialFields(book)).current;
    const form = useForm<Fields>(initial);
    const [confirmClose, setConfirmClose] = useState(false);
    const [coverOpen, setCoverOpen] = useState(false);
    const [authorDraft, setAuthorDraft] = useState('');
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState<Record<string, boolean>>({});
    const [dismissedLookup, setDismissedLookup] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const changed = (Object.keys(initial) as (keyof Fields)[]).filter((key) =>
        key === 'authors'
            ? form.data.authors.join('|') !== initial.authors.join('|')
            : form.data[key] !== initial[key],
    ).length;
    const diffs =
        lookup && !dismissedLookup ? diffsFrom(form.data, lookup) : [];
    const preview = form.data.cover_file
        ? URL.createObjectURL(form.data.cover_file)
        : form.data.cover_url || book.cover_url;
    const errors = form.errors as Record<string, string | undefined>;

    function requestClose() {
        if (changed > 0) {
            setConfirmClose(true);
        } else {
            onClose();
        }
    }

    function save() {
        form.transform((data) => ({
            ...data,
            cover_file: data.cover_file ?? undefined,
            _method: 'patch',
        }));
        form.post(update(book.id).url, {
            preserveScroll: true,
            forceFormData: form.data.cover_file !== null,
            onSuccess: onClose,
        });
    }

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                requestClose();
            } else if (event.metaKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                save();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    });

    function refresh() {
        setDismissedLookup(false);
        setPicked({});
        router.reload({
            only: ['lookup'],
            data: { lookup: form.data.isbn_13 },
            onStart: () => setSearching(true),
            onFinish: () => setSearching(false),
        });
    }

    function applyDiffs() {
        if (!lookup) {
            return;
        }

        for (const diff of diffs) {
            if (picked[diff.key] === false) {
                continue;
            }

            if (diff.key === 'authors') {
                form.setData('authors', lookup.authors);
            } else if (diff.key === 'cover_url') {
                form.setData('cover_url', lookup.cover_url ?? '');
            } else {
                form.setData(diff.key, diff.to);
            }
        }

        setDismissedLookup(true);
    }

    function addAuthor() {
        const name = authorDraft.trim().replace(/,$/, '');

        if (name !== '' && !form.data.authors.includes(name)) {
            form.setData('authors', [...form.data.authors, name]);
        }

        setAuthorDraft('');
    }

    function onAuthorKey(event: ReactKeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addAuthor();
        } else if (
            event.key === 'Backspace' &&
            authorDraft === '' &&
            form.data.authors.length > 0
        ) {
            form.setData('authors', form.data.authors.slice(0, -1));
        }
    }

    function onDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const file = event.dataTransfer.files[0];

        if (file) {
            form.setData('cover_file', file);
        }
    }

    return (
        <div
            className="fixed inset-0 z-40 bg-[rgba(3,6,10,0.55)]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    requestClose();
                }
            }}
        >
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Editar dados do livro"
                className="absolute inset-y-0 right-0 flex w-115 max-w-full flex-col border-l border-strong bg-surface shadow-[-24px_0_60px_rgba(0,0,0,0.5)]"
            >
                <div className="flex h-9 shrink-0 app-drag" />
                <div className="flex items-center justify-between gap-3 border-b px-5 pb-4">
                    <h2 className="font-mono text-[15px] font-bold">
                        ## editar dados
                    </h2>
                    <span
                        className={cn(
                            'font-mono text-[11px]',
                            changed > 0 ? 'text-warn' : 'text-faint',
                        )}
                    >
                        {changed === 0
                            ? 'sem alterações'
                            : `${changed} ${changed === 1 ? 'alteração' : 'alterações'}`}
                    </span>
                </div>

                <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4.5">
                    {diffs.length > 0 && (
                        <div className="flex flex-col gap-2 rounded-md border border-primary bg-active p-3">
                            <span className="text-[13px] font-semibold">
                                A fonte tem dados diferentes
                            </span>
                            {diffs.map((diff) => (
                                <label
                                    key={diff.key}
                                    className="grid grid-cols-[18px_72px_minmax(0,1fr)] items-start gap-2 text-xs"
                                >
                                    <input
                                        type="checkbox"
                                        checked={picked[diff.key] !== false}
                                        onChange={(event) =>
                                            setPicked({
                                                ...picked,
                                                [diff.key]:
                                                    event.target.checked,
                                            })
                                        }
                                        className="mt-0.5 size-3.5 accent-primary"
                                    />
                                    <span className="text-muted">
                                        {diff.label}
                                    </span>
                                    <span className="line-clamp-2">
                                        <span className="text-muted line-through">
                                            {diff.from}
                                        </span>{' '}
                                        → <strong>{diff.to}</strong>
                                    </span>
                                </label>
                            ))}
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-muted">
                                    Só aplica o marcado. Nada muda sem salvar.
                                </span>
                                <Button
                                    variant="ghost"
                                    onClick={applyDiffs}
                                    className="h-8 px-3 text-xs"
                                >
                                    Aplicar
                                </Button>
                            </div>
                        </div>
                    )}
                    {lookup === null && !searching && !dismissedLookup && (
                        <p className="text-xs text-muted">
                            Nada encontrado para este ISBN.
                        </p>
                    )}
                    {lookup && diffs.length === 0 && !dismissedLookup && (
                        <p className="text-xs text-muted">
                            A fonte não tem nada diferente do que está aqui.
                        </p>
                    )}

                    <div className="flex items-start gap-3.5">
                        <div className="flex w-24 shrink-0 flex-col gap-1.5">
                            <BookCover
                                src={preview}
                                title={form.data.title || 'sem capa'}
                                className="w-24"
                            />
                            <button
                                type="button"
                                onClick={() => setCoverOpen(!coverOpen)}
                                aria-expanded={coverOpen}
                                className="h-8 rounded-sm border text-xs text-accent hover:bg-active"
                            >
                                Trocar capa
                            </button>
                        </div>
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
                                    className="h-10 bg-bg font-semibold"
                                />
                            </Field>
                            <Field
                                label="Subtítulo"
                                error={form.errors.subtitle}
                            >
                                <Input
                                    value={form.data.subtitle}
                                    placeholder="opcional"
                                    onChange={(event) =>
                                        form.setData(
                                            'subtitle',
                                            event.target.value,
                                        )
                                    }
                                    className="h-10 bg-bg text-sm"
                                />
                            </Field>
                        </div>
                    </div>

                    {coverOpen && (
                        <div className="flex flex-col gap-2 rounded-md border bg-bg p-3">
                            <span className="font-mono text-[11px] text-muted">
                                ## nova capa
                            </span>
                            <div
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={onDrop}
                                className="flex h-16 items-center justify-center gap-1 rounded-sm border border-dashed border-strong text-xs text-nav"
                            >
                                {form.data.cover_file
                                    ? form.data.cover_file.name
                                    : 'Arraste uma imagem aqui ou'}
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    className="text-accent hover:underline"
                                >
                                    {form.data.cover_file
                                        ? 'trocar'
                                        : 'escolha um arquivo'}
                                </button>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="sr-only"
                                    onChange={(event) =>
                                        form.setData(
                                            'cover_file',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                            </div>
                            <Field
                                label="Ou cole o link de uma imagem"
                                error={
                                    form.errors.cover_url ??
                                    form.errors.cover_file
                                }
                            >
                                <Input
                                    type="url"
                                    value={form.data.cover_url}
                                    placeholder="https://…"
                                    onChange={(event) =>
                                        form.setData(
                                            'cover_url',
                                            event.target.value,
                                        )
                                    }
                                    className="h-9 text-[13px]"
                                />
                            </Field>
                            <span className="text-[11px] text-faint">
                                A imagem é guardada no Mac; não depende do link.
                                Trocar a capa não tem desfazer.
                            </span>
                        </div>
                    )}

                    <Field label="Autores" error={form.errors.authors}>
                        <span className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-sm border bg-bg px-2 py-1">
                            {form.data.authors.map((name) => (
                                <span
                                    key={name}
                                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-elevated pr-1 pl-2.5 text-[13px] text-text"
                                >
                                    {name}
                                    <button
                                        type="button"
                                        aria-label={`Tirar ${name}`}
                                        onClick={() =>
                                            form.setData(
                                                'authors',
                                                form.data.authors.filter(
                                                    (author) => author !== name,
                                                ),
                                            )
                                        }
                                        className="size-5 rounded-full text-muted hover:bg-active hover:text-text"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            <input
                                value={authorDraft}
                                onChange={(event) =>
                                    setAuthorDraft(event.target.value)
                                }
                                onKeyDown={onAuthorKey}
                                onBlur={addAuthor}
                                placeholder={
                                    form.data.authors.length
                                        ? 'adicionar…'
                                        : 'Nome do autor'
                                }
                                aria-label="Adicionar autor"
                                className="h-7 min-w-24 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-faint"
                            />
                        </span>
                    </Field>

                    <div className="grid grid-cols-2 gap-2.5">
                        <Field label="Páginas">
                            <Input
                                type="number"
                                min={1}
                                value={form.data.pages}
                                aria-invalid={errors.pages !== undefined}
                                onChange={(event) =>
                                    form.setData('pages', event.target.value)
                                }
                                className={cn(
                                    'h-10 bg-bg font-mono text-sm',
                                    errors.pages && 'border-danger-line',
                                )}
                            />
                        </Field>
                        <Field label="Gênero" error={form.errors.genre}>
                            <Input
                                list="book-editor-genres"
                                value={form.data.genre}
                                onChange={(event) =>
                                    form.setData('genre', event.target.value)
                                }
                                className="h-10 bg-bg text-sm"
                            />
                            <datalist id="book-editor-genres">
                                {genres.map((genre) => (
                                    <option key={genre} value={genre} />
                                ))}
                            </datalist>
                        </Field>
                    </div>
                    {errors.pages && (
                        <div
                            role="alert"
                            className="flex flex-col items-start gap-1.5 rounded-sm border border-danger-line bg-[#1c1013] px-3 py-2.5 text-xs leading-relaxed text-danger"
                        >
                            <span>{errors.pages}</span>
                            {errors.pages_session && (
                                <button
                                    type="button"
                                    onClick={onShowSessions}
                                    className="font-semibold text-accent hover:underline"
                                >
                                    Editar essa sessão primeiro ›
                                </button>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5">
                        <Field label="Editora" error={form.errors.publisher}>
                            <Input
                                value={form.data.publisher}
                                onChange={(event) =>
                                    form.setData(
                                        'publisher',
                                        event.target.value,
                                    )
                                }
                                className="h-10 bg-bg text-sm"
                            />
                        </Field>
                        <Field label="Ano" error={form.errors.published_year}>
                            <Input
                                type="number"
                                value={form.data.published_year}
                                onChange={(event) =>
                                    form.setData(
                                        'published_year',
                                        event.target.value,
                                    )
                                }
                                className="h-10 bg-bg text-sm"
                            />
                        </Field>
                    </div>

                    <div className="flex flex-col gap-1.5 text-[13px] text-muted">
                        <label htmlFor="book-editor-isbn">ISBN</label>
                        <span className="flex gap-1.5">
                            <Input
                                id="book-editor-isbn"
                                value={form.data.isbn_13}
                                aria-invalid={errors.isbn_13 !== undefined}
                                onChange={(event) =>
                                    form.setData('isbn_13', event.target.value)
                                }
                                className={cn(
                                    'h-10 flex-1 bg-bg font-mono text-sm',
                                    errors.isbn_13 && 'border-danger-line',
                                )}
                            />
                            <Button
                                variant="ghost"
                                onClick={refresh}
                                disabled={
                                    searching || form.data.isbn_13.trim() === ''
                                }
                                title="Buscar os dados de novo por este ISBN"
                                className="h-10 shrink-0 px-3 text-xs text-accent"
                            >
                                {searching ? 'buscando…' : '↻ buscar'}
                            </Button>
                        </span>
                    </div>
                    {errors.isbn_13 && (
                        <div
                            role="alert"
                            className="flex flex-col items-start gap-1.5 rounded-sm border border-danger-line bg-[#1c1013] px-3 py-2.5 text-xs leading-relaxed text-danger"
                        >
                            <span>{errors.isbn_13}</span>
                            {errors.isbn_13_book && (
                                <>
                                    <span className="text-nav">
                                        Se são edições diferentes, cada uma pode
                                        ficar com seu ISBN.
                                    </span>
                                    <Link
                                        href={show.url(
                                            Number(errors.isbn_13_book),
                                        )}
                                        className="font-semibold text-accent hover:underline"
                                    >
                                        Abrir o outro livro ›
                                    </Link>
                                </>
                            )}
                        </div>
                    )}

                    <Field label="Sinopse" error={form.errors.description}>
                        <Textarea
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData('description', event.target.value)
                            }
                            className="min-h-22 bg-bg text-[13px] leading-relaxed"
                        />
                    </Field>

                    {confirmClose && (
                        <div
                            role="alert"
                            className="flex flex-wrap items-center gap-2 rounded-sm border border-warn-line bg-[#1a1610] px-3 py-2.5 text-[13px] text-warn"
                        >
                            <span className="flex-1">
                                Descartar{' '}
                                {changed === 1
                                    ? 'a alteração'
                                    : `${changed} alterações`}
                                ?
                            </span>
                            <Button
                                variant="ghost"
                                autoFocus
                                onClick={() => setConfirmClose(false)}
                                className="h-8 bg-elevated px-2.5 text-xs"
                            >
                                Continuar editando
                            </Button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-8 rounded-sm bg-danger-fill px-2.5 text-xs font-semibold text-white"
                            >
                                Descartar
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t bg-[#0d131c] px-5 py-3.5">
                    <Button
                        variant="ghost"
                        onClick={requestClose}
                        className="h-10 bg-elevated text-[13px]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={save}
                        disabled={form.processing || changed === 0}
                        className="h-10 text-[13px]"
                    >
                        {form.processing ? 'Salvando…' : 'Salvar'}
                        <span className="font-mono text-[11px] opacity-85">
                            ⌘S
                        </span>
                    </Button>
                </div>
            </aside>
        </div>
    );
}
