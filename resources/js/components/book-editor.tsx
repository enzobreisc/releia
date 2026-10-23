import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AmazonCoverField } from '@/components/amazon-cover-field';
import { BookCover } from '@/components/book-cover';
import { GenreSelect } from '@/components/genre-select';
import { Button, Field, Input, Textarea } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
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
    label: TranslationKey;
    from: string;
    to: string;
};

function initialFields(book: BookDetail): Fields {
    return {
        title: book.title,
        subtitle: book.subtitle ?? '',
        // One by one, as saved: splitting the text "A, B" on commas breaks names like "Silva, João".
        authors: book.author_links.map((author) => author.name),
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

/** What the source has that differs from what is saved. */
function diffsFrom(
    fields: Fields,
    candidate: Candidate,
    emptyLabel: string,
): Diff[] {
    const pairs: [Diff['key'], TranslationKey, string, string | null][] = [
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
            from: from === '' ? emptyLabel : from,
            to: to!,
        }));
}

/**
 * "Edit data" panel (drawer on the right). Fixes what came wrong from the registration:
 * title, authors, pages, cover… Esc with changes asks to discard right there.
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
    const { t, plural } = useTranslation();
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
        lookup && !dismissedLookup
            ? diffsFrom(form.data, lookup, t('(vazio)'))
            : [];
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
            // Holding the key repeats the event and would delete several authors at once.
            !event.repeat &&
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
                aria-label={t('Editar dados do livro')}
                className="absolute inset-y-0 right-0 flex w-115 max-w-full flex-col bg-surface shadow-float inset-ring inset-ring-border"
            >
                <div className="flex h-9 shrink-0 app-drag" />
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 pb-4">
                    <h2 className="text-xl font-extrabold tracking-tight first-letter:uppercase">
                        {t('editar dados')}
                    </h2>
                    <span
                        className={cn(
                            'font-mono text-xs',
                            changed > 0 ? 'text-warn' : 'text-faint',
                        )}
                    >
                        {changed === 0
                            ? t('sem alterações')
                            : plural(changed, 'alteração', 'alterações')}
                    </span>
                </div>

                <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4.5">
                    {diffs.length > 0 && (
                        <div className="flex flex-col gap-2 rounded-md bg-active p-4 inset-ring inset-ring-primary">
                            <span className="text-[13px] font-semibold">
                                {t('A fonte tem dados diferentes')}
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
                                        {t(diff.label)}
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
                                    {t(
                                        'Só aplica o marcado. Nada muda sem salvar.',
                                    )}
                                </span>
                                <Button
                                    variant="ghost"
                                    onClick={applyDiffs}
                                    className="h-8 px-3 text-xs"
                                >
                                    {t('Aplicar')}
                                </Button>
                            </div>
                        </div>
                    )}
                    {lookup === null && !searching && !dismissedLookup && (
                        <p className="text-xs text-muted">
                            {t('Nada encontrado para este ISBN.')}
                        </p>
                    )}
                    {lookup && diffs.length === 0 && !dismissedLookup && (
                        <p className="text-xs text-muted">
                            {t(
                                'A fonte não tem nada diferente do que está aqui.',
                            )}
                        </p>
                    )}

                    <div className="flex items-start gap-3.5">
                        <div className="flex w-24 shrink-0 flex-col gap-1.5">
                            <BookCover
                                src={preview}
                                title={form.data.title || t('sem capa')}
                                className="w-24"
                            />
                            <Button
                                variant="ghost"
                                onClick={() => setCoverOpen(!coverOpen)}
                                aria-expanded={coverOpen}
                                className="h-8 px-3 text-xs text-link"
                            >
                                {t('Trocar capa')}
                            </Button>
                        </div>
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
                                    className="h-10 bg-bg font-semibold"
                                />
                            </Field>
                            <Field
                                label={t('Subtítulo')}
                                error={form.errors.subtitle}
                            >
                                <Input
                                    value={form.data.subtitle}
                                    placeholder={t('opcional')}
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
                        <div className="flex flex-col gap-2 rounded-md bg-bg p-3.5 inset-ring inset-ring-border">
                            <span className="text-xs font-bold text-muted first-letter:uppercase">
                                {t('nova capa')}
                            </span>
                            <div
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={onDrop}
                                className="flex h-16 items-center justify-center gap-1 rounded-sm border border-dashed border-strong text-xs text-secondary"
                            >
                                {form.data.cover_file
                                    ? form.data.cover_file.name
                                    : t('Arraste uma imagem aqui ou')}
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    className="text-accent hover:underline"
                                >
                                    {form.data.cover_file
                                        ? t('trocar')
                                        : t('escolha um arquivo')}
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
                                label={t('Ou cole o link de uma imagem')}
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
                            <AmazonCoverField
                                onFound={(coverUrl) => {
                                    // A file chosen earlier is superseded: the new link is the one that counts now.
                                    form.setData((data) => ({
                                        ...data,
                                        cover_file: null,
                                        cover_url: coverUrl,
                                    }));
                                }}
                            />
                            <span className="text-[11px] text-faint">
                                {t(
                                    'A imagem é guardada no Mac; não depende do link. Trocar a capa não tem desfazer.',
                                )}
                            </span>
                        </div>
                    )}

                    <Field label={t('Autores')} error={form.errors.authors}>
                        <span className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-full bg-surface px-2 py-1 inset-ring inset-ring-border">
                            {form.data.authors.map((name, index) => (
                                <span
                                    key={`${index}:${name}`}
                                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-elevated pr-1 pl-2.5 text-[13px] text-text"
                                >
                                    {name}
                                    <button
                                        type="button"
                                        aria-label={t('Tirar :name', { name })}
                                        onClick={() =>
                                            form.setData(
                                                'authors',
                                                form.data.authors.filter(
                                                    (_, position) =>
                                                        position !== index,
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
                                        ? t('adicionar…')
                                        : t('Nome do autor')
                                }
                                aria-label={t('Adicionar autor')}
                                className="h-7 min-w-24 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-faint"
                            />
                        </span>
                    </Field>

                    <div className="grid grid-cols-2 gap-2.5">
                        <Field label={t('Páginas')}>
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
                                    errors.pages && 'inset-ring-danger-line',
                                )}
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
                                className="text-sm"
                            />
                            {form.errors.genre && (
                                <span className="text-xs font-semibold text-danger">
                                    {form.errors.genre}
                                </span>
                            )}
                        </div>
                    </div>
                    {errors.pages && (
                        <div
                            role="alert"
                            className="flex flex-col items-start gap-1.5 rounded-sm bg-danger-fill/15 px-3.5 py-3 text-xs leading-relaxed text-danger inset-ring inset-ring-danger-line"
                        >
                            <span>{errors.pages}</span>
                            {errors.pages_session && (
                                <button
                                    type="button"
                                    onClick={onShowSessions}
                                    className="font-semibold text-accent hover:underline"
                                >
                                    {t('Editar essa sessão primeiro ›')}
                                </button>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5">
                        <Field
                            label={t('Editora')}
                            error={form.errors.publisher}
                        >
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
                        <Field
                            label={t('Ano')}
                            error={form.errors.published_year}
                        >
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
                                    errors.isbn_13 && 'inset-ring-danger-line',
                                )}
                            />
                            <Button
                                variant="ghost"
                                onClick={refresh}
                                disabled={
                                    searching || form.data.isbn_13.trim() === ''
                                }
                                title={t(
                                    'Buscar os dados de novo por este ISBN',
                                )}
                                className="h-10 shrink-0 px-3 text-xs text-accent"
                            >
                                {searching ? t('buscando…') : t('↻ buscar')}
                            </Button>
                        </span>
                    </div>
                    {errors.isbn_13 && (
                        <div
                            role="alert"
                            className="flex flex-col items-start gap-1.5 rounded-sm bg-danger-fill/15 px-3.5 py-3 text-xs leading-relaxed text-danger inset-ring inset-ring-danger-line"
                        >
                            <span>{errors.isbn_13}</span>
                            {errors.isbn_13_book && (
                                <>
                                    <span className="text-secondary">
                                        {t(
                                            'Se são edições diferentes, cada uma pode ficar com seu ISBN.',
                                        )}
                                    </span>
                                    <Link
                                        href={show.url(
                                            Number(errors.isbn_13_book),
                                        )}
                                        className="font-semibold text-accent hover:underline"
                                    >
                                        {t('Abrir o outro livro ›')}
                                    </Link>
                                </>
                            )}
                        </div>
                    )}

                    <Field label={t('Sinopse')} error={form.errors.description}>
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
                            className="flex flex-wrap items-center gap-2 rounded-sm bg-warn-fill px-3.5 py-3 text-[13px] text-warn inset-ring inset-ring-warn-line"
                        >
                            <span className="flex-1">
                                {changed === 1
                                    ? t('Descartar a alteração?')
                                    : t('Descartar :count alterações?', {
                                          count: changed,
                                      })}
                            </span>
                            <Button
                                variant="ghost"
                                autoFocus
                                onClick={() => setConfirmClose(false)}
                                className="h-8 bg-elevated px-2.5 text-xs"
                            >
                                {t('Continuar editando')}
                            </Button>
                            <Button
                                variant="danger"
                                onClick={onClose}
                                className="h-8 px-3 text-xs"
                            >
                                {t('Descartar')}
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3.5">
                    <Button
                        variant="ghost"
                        onClick={requestClose}
                        className="h-10 bg-elevated text-[13px]"
                    >
                        {t('Cancelar')}
                    </Button>
                    <Button
                        onClick={save}
                        disabled={form.processing || changed === 0}
                        className="h-10 text-[13px]"
                    >
                        {form.processing ? t('Salvando…') : t('Salvar')}
                        <span className="font-mono text-[11px] opacity-85">
                            ⌘S
                        </span>
                    </Button>
                </div>
            </aside>
        </div>
    );
}
