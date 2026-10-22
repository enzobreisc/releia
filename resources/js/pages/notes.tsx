import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { Kbd } from '@/components/app-sidebar';
import { Button, Field, Input, Select } from '@/components/form';
import { NoteEditor } from '@/components/note-editor';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { PlusIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { index, review } from '@/routes/notes';
import type { Option } from '@/types';
import type {
    NoteBook,
    NoteCard,
    NoteFilters,
    NoteTagCount,
} from '@/types/notes';

type NotesProps = {
    notes: NoteCard[];
    selected: NoteCard | null;
    creating: boolean;
    books: NoteBook[];
    kinds: Option[];
    kind_counts: Record<string, number>;
    tags: NoteTagCount[];
    review: {
        count: number;
        books: number;
        notes: NoteCard[];
    };
    filters: NoteFilters;
};

const KIND_TABS: { value: string | null; label: TranslationKey }[] = [
    { value: null, label: 'Todas' },
    { value: 'excerpt', label: 'Trechos' },
    { value: 'reflection', label: 'Reflexões' },
    { value: 'quote', label: 'Citações' },
];

export default function Notes({
    notes,
    selected,
    creating,
    books,
    kinds,
    kind_counts,
    tags,
    review: due,
    filters,
}: NotesProps) {
    const { t, plural } = useTranslation();
    const searchRef = useRef<HTMLInputElement>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Filters, selected note and "new" mode travel together in the URL.
    function visit(changes: Record<string, string | number | null>) {
        const next: Record<string, string | number | null> = {
            q: filters.q,
            book: filters.book,
            kind: filters.kind,
            tag: filters.tag,
            note: selected?.id ?? null,
            ...changes,
        };

        router.get(
            index.url(),
            Object.fromEntries(
                Object.entries(next).filter(
                    ([, value]) => value !== null && value !== '',
                ),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    // ⌘F: search the notes.
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.metaKey && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                searchRef.current?.focus();
                searchRef.current?.select();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    function onSearch(value: string) {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => visit({ q: value }), 250);
    }

    const total = Object.values(kind_counts).reduce((sum, n) => sum + n, 0);

    return (
        <>
            <PageHeader
                title={t('Notas')}
                description={t('Guarde trechos e ideias por livro')}
                actions={
                    <Button
                        variant="ghost"
                        onClick={() => visit({ note: null, new: 1 })}
                    >
                        <PlusIcon /> {t('Nova nota')}
                    </Button>
                }
            />

            <section className="flex flex-col gap-3.5 rounded-md border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <SectionTitle>{t('revisão do dia')}</SectionTitle>
                    <span className="font-mono text-xs text-muted">
                        {due.count === 0
                            ? t('nada para rever hoje')
                            : t(':excerpts para rever, de :books', {
                                  excerpts: plural(
                                      due.count,
                                      'trecho',
                                      'trechos',
                                  ),
                                  books: plural(due.books, 'livro', 'livros'),
                              })}
                    </span>
                </div>
                {due.notes.length > 0 && (
                    <ul className="flex flex-col divide-y">
                        {due.notes.map((note) => (
                            <li
                                key={note.id}
                                className="flex flex-wrap items-start gap-3 py-3"
                            >
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                    <span className="font-mono text-[11px] text-muted">
                                        {note.book_title}
                                        {note.page
                                            ? ` · ${t('p. :page', { page: note.page })}`
                                            : ''}
                                    </span>
                                    <span className="line-clamp-3 text-sm">
                                        {note.body_md}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    className="h-9 px-3 text-[13px]"
                                    onClick={() =>
                                        router.post(
                                            review.url(note.id),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    {t('Revisei')}
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <div className="flex flex-wrap gap-3">
                <Field
                    className="flex-[2_1_240px]"
                    label={
                        <span className="flex items-center gap-2">
                            {t('Buscar')} <Kbd>⌘F</Kbd>
                        </span>
                    }
                >
                    <Input
                        ref={searchRef}
                        type="search"
                        defaultValue={filters.q}
                        onChange={(event) => onSearch(event.target.value)}
                        placeholder={t('Texto ou tag, sem acento')}
                    />
                </Field>
                <Field label={t('Livro')} className="flex-[1_1_180px]">
                    <Select
                        value={filters.book ?? ''}
                        onChange={(event) =>
                            visit({ book: event.target.value || null })
                        }
                    >
                        <option value="">{t('Todos os livros')}</option>
                        {books.map((book) => (
                            <option key={book.id} value={book.id}>
                                {book.title}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t('Tag')} className="flex-[1_1_150px]">
                    <Select
                        value={filters.tag ?? ''}
                        onChange={(event) =>
                            visit({ tag: event.target.value || null })
                        }
                    >
                        <option value="">{t('Todas as tags')}</option>
                        {tags.map((tag) => (
                            <option key={tag.name} value={tag.name}>
                                #{tag.name} ({tag.count})
                            </option>
                        ))}
                    </Select>
                </Field>
            </div>

            <div
                role="tablist"
                aria-label={t('Tipo de nota')}
                className="flex flex-wrap gap-2 border-b pb-3"
            >
                {KIND_TABS.map((tab) => {
                    const selectedTab = (filters.kind ?? null) === tab.value;
                    const count =
                        tab.value === null
                            ? total
                            : (kind_counts[tab.value] ?? 0);

                    return (
                        <button
                            key={tab.label}
                            type="button"
                            role="tab"
                            aria-selected={selectedTab}
                            onClick={() => visit({ kind: tab.value })}
                            className={cn(
                                'rounded-sm px-4 py-2 text-sm',
                                selectedTab
                                    ? 'bg-primary font-semibold text-white'
                                    : 'border bg-surface text-text hover:bg-active',
                            )}
                        >
                            {t(tab.label)}{' '}
                            <span className="font-mono text-xs opacity-75">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <section className="flex flex-col gap-2">
                    {notes.length === 0 ? (
                        <p className="rounded-md border bg-surface p-5 font-mono text-sm text-muted">
                            ## {t('nenhuma nota com esses filtros')}
                        </p>
                    ) : (
                        notes.map((note) => (
                            <button
                                key={note.id}
                                type="button"
                                onClick={() =>
                                    visit({ note: note.id, new: null })
                                }
                                aria-current={selected?.id === note.id}
                                className={cn(
                                    'flex flex-col gap-1.5 rounded-md border p-4 text-left',
                                    selected?.id === note.id
                                        ? 'border-primary bg-active'
                                        : 'bg-surface hover:bg-active',
                                )}
                            >
                                <span className="font-mono text-[11px] text-muted">
                                    {note.book_title}
                                    {note.page
                                        ? ` · ${t('p. :page', { page: note.page })}`
                                        : ''}{' '}
                                    · {note.kind_label}
                                </span>
                                <span className="line-clamp-3 text-sm text-text">
                                    {note.body_md}
                                </span>
                                {note.tags.length > 0 && (
                                    <span className="font-mono text-[11px] text-accent">
                                        {note.tags
                                            .map((tag) => `#${tag}`)
                                            .join(' ')}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </section>

                {selected || creating ? (
                    <NoteEditor
                        key={selected ? `note-${selected.id}` : 'new'}
                        note={selected}
                        books={books}
                        kinds={kinds}
                        initialBookId={filters.book}
                    />
                ) : (
                    <section className="flex flex-col gap-3 rounded-md border bg-surface p-5">
                        <SectionTitle>{t('escolha uma nota')}</SectionTitle>
                        <p className="text-sm text-muted">
                            {t(
                                'Selecione uma nota da lista para ler e editar, ou crie uma nova.',
                            )}
                        </p>
                    </section>
                )}
            </div>
        </>
    );
}
