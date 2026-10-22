import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Markdown } from '@/components/markdown';
import { Button, Field, Input, Select, Textarea } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { destroy, store, update } from '@/routes/notes';
import { show } from '@/routes/books';
import type { NoteBook, NoteCard } from '@/types/notes';
import type { Option } from '@/types';

type NoteEditorProps = {
    /** Existing note; null when it is a new note. */
    note: NoteCard | null;
    books: NoteBook[];
    kinds: Option[];
    /** Book already chosen when creating from a book. */
    initialBookId: number | null;
};

/**
 * Note editor: Markdown text with preview, kind, page and book.
 * Remounted by the screen (key) when the note changes, so local state does not leak.
 */
export function NoteEditor({
    note,
    books,
    kinds,
    initialBookId,
}: NoteEditorProps) {
    const { t } = useTranslation();
    const [bookId, setBookId] = useState(
        String(note?.book_id ?? initialBookId ?? books[0]?.id ?? ''),
    );
    const [kind, setKind] = useState(note?.kind ?? kinds[0]?.value ?? '');
    const [page, setPage] = useState(note?.page ? String(note.page) : '');
    const [body, setBody] = useState(note?.body_md ?? '');
    const [tab, setTab] = useState<'edit' | 'preview'>('edit');
    const [saving, setSaving] = useState(false);

    const data = {
        book_id: bookId === '' ? null : Number(bookId),
        kind,
        page: page === '' ? null : Number(page),
        body_md: body,
    };

    function save() {
        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        };

        if (note) {
            router.patch(update.url(note.id), data, options);
        } else {
            router.post(store.url(), data, options);
        }
    }

    // Deletes right away: the notice offers undo (text, tags and page come back).
    function remove() {
        if (note) {
            router.delete(destroy.url(note.id));
        }
    }

    if (books.length === 0) {
        return (
            <section className="rounded-md border bg-surface p-5 text-sm text-muted">
                {t('Cadastre um livro antes de criar notas.')}
            </section>
        );
    }

    return (
        <section className="flex min-w-0 flex-col gap-4 rounded-md border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle>
                    {note ? t('editar nota') : t('nova nota')}
                </SectionTitle>
                <div
                    role="tablist"
                    aria-label={t('Modo do editor')}
                    className="flex gap-1.5"
                >
                    {(['edit', 'preview'] as const).map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            role="tab"
                            aria-selected={tab === mode}
                            onClick={() => setTab(mode)}
                            className={
                                tab === mode
                                    ? 'rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-white'
                                    : 'rounded-sm border bg-surface px-3 py-1.5 text-xs text-text hover:bg-active'
                            }
                        >
                            {mode === 'edit' ? t('Editar') : t('Prévia')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Field label={t('Livro')}>
                    <Select
                        value={bookId}
                        onChange={(event) => setBookId(event.target.value)}
                    >
                        {books.map((book) => (
                            <option key={book.id} value={book.id}>
                                {book.title}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t('Tipo')}>
                    <Select
                        value={kind}
                        onChange={(event) => setKind(event.target.value)}
                    >
                        {kinds.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t('Página')}>
                    <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={page}
                        onChange={(event) => setPage(event.target.value)}
                    />
                </Field>
            </div>

            {tab === 'edit' ? (
                <Field label={t('Texto (Markdown). Tags: #tema')}>
                    <Textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        className="min-h-64 font-mono text-[14px]"
                        placeholder={t(
                            'Escreva o trecho, a reflexão ou a citação…',
                        )}
                    />
                </Field>
            ) : (
                <div className="min-h-64 rounded-sm border bg-bg p-4">
                    {body.trim() === '' ? (
                        <p className="text-sm text-muted">
                            {t('Nada para mostrar ainda.')}
                        </p>
                    ) : (
                        <Markdown source={body} />
                    )}
                </div>
            )}

            {note && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-[10px] bg-elevated px-2 py-0.5 font-mono text-[11px] text-accent"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button onClick={save} disabled={saving || body.trim() === ''}>
                    {saving
                        ? t('Salvando…')
                        : note
                          ? t('Salvar')
                          : t('Criar nota')}
                </Button>
                {note && (
                    <>
                        <Link
                            href={show.url(note.book_id)}
                            className="text-sm text-muted hover:text-text"
                        >
                            {t('Ver no livro')}
                        </Link>
                        <span className="ml-auto" />
                        <Button variant="danger" onClick={remove}>
                            {t('Excluir')}
                        </Button>
                    </>
                )}
            </div>
        </section>
    );
}
