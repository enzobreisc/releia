import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { Bookshelf } from '@/components/bookshelf';
import { Kbd } from '@/components/app-sidebar';
import { cardClass } from '@/components/card';
import {
    buttonClass,
    Field,
    Input,
    Segmented,
    Select,
} from '@/components/form';
import { PlusIcon } from '@/components/icons';
import { PageHeader } from '@/components/page-header';
import { QueueButton } from '@/components/queue-button';
import { StatusBadge } from '@/components/status';
import { useStored } from '@/hooks/use-stored';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { SHELF_GROUPS } from '@/lib/spines';
import type { ShelfGroup } from '@/lib/spines';
import { cn } from '@/lib/utils';
import { create as addBook, show } from '@/routes/books';
import { index as libraryIndex } from '@/routes/library';
import type { Bookshelf as BookshelfModel, Shelf, SpineBook } from '@/types';

type Filters = {
    q: string;
    genre: string;
    shelf: string | null;
    sort: string;
};

type LibraryProps = {
    books: SpineBook[];
    shelves: Shelf[];
    bookshelves: BookshelfModel[];
    genres: string[];
    filters: Filters;
};

const SORTS: { value: string; label: TranslationKey }[] = [
    { value: 'recent', label: 'Adicionados recentemente' },
    { value: 'title', label: 'Título' },
    { value: 'rating', label: 'Nota' },
];

export default function Library({
    books,
    shelves,
    bookshelves,
    genres,
    filters,
}: LibraryProps) {
    const { t, plural, translateText } = useTranslation();
    const [view, setView] = useStored<'grid' | 'shelf'>('library.view', 'grid');
    const [group, setGroup] = useStored<ShelfGroup>('library.group', 'genre');
    const [search, setSearch] = useState(filters.q);
    const searchRef = useRef<HTMLInputElement>(null);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const total = shelves[0]?.count ?? 0;

    function apply(changes: Partial<Filters>) {
        const next = { ...filters, q: search, ...changes };

        router.get(
            libraryIndex.url(),
            {
                q: next.q || undefined,
                genre: next.genre || undefined,
                shelf: next.shelf || undefined,
                sort: next.sort === 'recent' ? undefined : next.sort,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    // Searches while typing, with a short delay.
    function onSearch(value: string) {
        setSearch(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => apply({ q: value }), 250);
    }

    // ⌘F: search the current screen.
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

    return (
        <>
            <PageHeader
                title={t('Biblioteca')}
                description={t(':books no total', {
                    books: plural(total, 'livro', 'livros'),
                })}
                actions={
                    <Segmented
                        className="w-48"
                        value={view}
                        onChange={(next) => setView(next as 'grid' | 'shelf')}
                        options={[
                            { value: 'grid', label: t('Capas') },
                            { value: 'shelf', label: t('Estante') },
                        ]}
                    />
                }
            />

            <div className="flex flex-wrap gap-3">
                <Field
                    className="flex-[2_1_260px]"
                    label={
                        <span className="flex items-center gap-2">
                            {t('Buscar')} <Kbd>⌘F</Kbd>
                        </span>
                    }
                >
                    <Input
                        ref={searchRef}
                        type="search"
                        value={search}
                        onChange={(event) => onSearch(event.target.value)}
                        placeholder={t('Título, autor ou ISBN')}
                    />
                </Field>
                <Field label={t('Gênero')} className="flex-[1_1_160px]">
                    <Select
                        value={filters.genre}
                        onChange={(event) =>
                            apply({ genre: event.target.value })
                        }
                    >
                        <option value="">{t('Todos')}</option>
                        {genres.map((genre) => (
                            <option key={genre} value={genre}>
                                {translateText(genre)}
                            </option>
                        ))}
                    </Select>
                </Field>
                {view === 'shelf' ? (
                    <Field
                        label={t('Organizar por')}
                        className="flex-[1_1_160px]"
                    >
                        <Select
                            value={group}
                            onChange={(event) =>
                                setGroup(event.target.value as ShelfGroup)
                            }
                        >
                            {SHELF_GROUPS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {t(option.label)}
                                </option>
                            ))}
                        </Select>
                    </Field>
                ) : (
                    <Field
                        label={t('Ordenar por')}
                        className="flex-[1_1_160px]"
                    >
                        <Select
                            value={filters.sort}
                            onChange={(event) =>
                                apply({ sort: event.target.value })
                            }
                        >
                            {SORTS.map((sort) => (
                                <option key={sort.value} value={sort.value}>
                                    {t(sort.label)}
                                </option>
                            ))}
                        </Select>
                    </Field>
                )}
            </div>

            <div
                role="tablist"
                aria-label={t('Estantes')}
                className="flex flex-wrap gap-2 border-b pb-5"
            >
                {shelves.map((shelf) => {
                    const selected = (filters.shelf ?? null) === shelf.value;

                    return (
                        <button
                            key={shelf.label}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => apply({ shelf: shelf.value })}
                            className={cn(
                                'flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-bold',
                                selected
                                    ? 'bg-text text-bg'
                                    : 'bg-surface text-secondary inset-ring inset-ring-border hover:bg-elevated hover:text-text',
                            )}
                        >
                            {shelf.label}{' '}
                            <span className="font-mono text-[11px] font-normal opacity-75">
                                {shelf.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {view === 'shelf' && (books.length > 0 || group === 'custom') ? (
                <Bookshelf
                    books={books}
                    group={group}
                    bookshelves={bookshelves}
                />
            ) : books.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-5.5 gap-y-8">
                    {books.map((book) => (
                        // The queue button sits outside the Link, which cannot contain buttons.
                        <div
                            key={book.id}
                            className="flex min-w-0 flex-col gap-2.5"
                        >
                            <Link
                                href={show.url(book.id)}
                                className="group flex min-w-0 flex-col gap-2.5"
                            >
                                <span className="relative">
                                    <BookCover
                                        src={book.cover_url}
                                        title={book.title}
                                        className="w-full transition group-hover:-translate-y-0.5"
                                    />
                                    {(book.readings_count ?? 0) > 1 && (
                                        <span
                                            title={plural(
                                                book.readings_count ?? 0,
                                                'leitura',
                                                'leituras',
                                            )}
                                            className="absolute top-2 right-2 rounded-full bg-bg/85 px-2 py-0.75 font-mono text-[10px] text-text"
                                        >
                                            ↻ {book.readings_count}
                                        </span>
                                    )}
                                </span>
                                <span className="flex min-w-0 flex-col gap-0.75">
                                    <span className="line-clamp-2 text-sm leading-tight font-bold">
                                        {book.title}
                                    </span>
                                    <span className="truncate text-[13px] font-medium text-muted">
                                        {book.authors ||
                                            t('Autor desconhecido')}
                                    </span>
                                </span>
                                {book.status && book.status_label && (
                                    <StatusBadge
                                        status={book.status}
                                        label={book.status_label}
                                    />
                                )}
                            </Link>
                            {book.status === 'want_to_read' && (
                                <QueueButton
                                    bookId={book.id}
                                    position={book.queue_position}
                                    className="h-8 px-3"
                                />
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyLibrary filtered={total > 0} />
            )}
        </>
    );
}

function EmptyLibrary({ filtered }: { filtered: boolean }) {
    const { t } = useTranslation();

    return (
        <div className={cardClass('flex flex-col items-start gap-4 p-6')}>
            <p className="text-[15px] font-semibold text-muted">
                {filtered
                    ? t('Nenhum livro com esses filtros.')
                    : t('Sua biblioteca está vazia.')}
            </p>
            {!filtered && (
                <Link href={addBook.url()} className={buttonClass()}>
                    <PlusIcon /> {t('Adicionar o primeiro livro')}
                </Link>
            )}
        </div>
    );
}
