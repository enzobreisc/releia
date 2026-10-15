import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { Kbd } from '@/components/app-sidebar';
import { buttonClass, Field, Input, Select } from '@/components/form';
import { PlusIcon } from '@/components/icons';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';
import { create as addBook, show } from '@/routes/books';
import { index as libraryIndex } from '@/routes/library';
import type { BookCard, Shelf } from '@/types';

type Filters = {
    q: string;
    genero: string;
    estante: string | null;
    ordem: string;
};

type LibraryProps = {
    books: BookCard[];
    shelves: Shelf[];
    genres: string[];
    filters: Filters;
};

const SORTS = [
    { value: 'recentes', label: 'Adicionados recentemente' },
    { value: 'titulo', label: 'Título' },
    { value: 'nota', label: 'Nota' },
];

export default function Library({
    books,
    shelves,
    genres,
    filters,
}: LibraryProps) {
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
                genero: next.genero || undefined,
                estante: next.estante || undefined,
                ordem: next.ordem === 'recentes' ? undefined : next.ordem,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    // Busca enquanto digita, com uma pequena espera.
    function onSearch(value: string) {
        setSearch(value);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => apply({ q: value }), 250);
    }

    // ⌘F: buscar na tela atual.
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
                title="Biblioteca"
                actions={
                    <span className="text-sm text-muted">
                        {total} {total === 1 ? 'livro' : 'livros'} no total
                    </span>
                }
            />

            <div className="flex flex-wrap gap-3">
                <Field
                    className="flex-[2_1_240px]"
                    label={
                        <span className="flex items-center gap-2">
                            Buscar <Kbd>⌘F</Kbd>
                        </span>
                    }
                >
                    <Input
                        ref={searchRef}
                        type="search"
                        value={search}
                        onChange={(event) => onSearch(event.target.value)}
                        placeholder="Título, autor ou ISBN"
                    />
                </Field>
                <Field label="Gênero" className="flex-[1_1_150px]">
                    <Select
                        value={filters.genero}
                        onChange={(event) =>
                            apply({ genero: event.target.value })
                        }
                    >
                        <option value="">Todos</option>
                        {genres.map((genre) => (
                            <option key={genre} value={genre}>
                                {genre}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Ordenar por" className="flex-[1_1_150px]">
                    <Select
                        value={filters.ordem}
                        onChange={(event) =>
                            apply({ ordem: event.target.value })
                        }
                    >
                        {SORTS.map((sort) => (
                            <option key={sort.value} value={sort.value}>
                                {sort.label}
                            </option>
                        ))}
                    </Select>
                </Field>
            </div>

            <div
                role="tablist"
                aria-label="Estantes"
                className="flex flex-wrap gap-2 border-b pb-3"
            >
                {shelves.map((shelf) => {
                    const selected = (filters.estante ?? null) === shelf.value;

                    return (
                        <button
                            key={shelf.label}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => apply({ estante: shelf.value })}
                            className={cn(
                                'rounded-sm px-4 py-3 text-sm',
                                selected
                                    ? 'bg-primary font-semibold text-white'
                                    : 'border bg-surface text-text hover:bg-active',
                            )}
                        >
                            {shelf.label}{' '}
                            <span className="font-mono text-xs opacity-75">
                                {shelf.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {books.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-x-5 gap-y-6">
                    {books.map((book) => (
                        <Link
                            key={book.id}
                            href={show.url(book.id)}
                            className="group flex flex-col gap-2"
                        >
                            <BookCover
                                src={book.cover_url}
                                title={book.title}
                                className="w-full transition group-hover:border-primary"
                            />
                            <div className="line-clamp-2 text-sm font-semibold">
                                {book.title}
                            </div>
                            <div className="line-clamp-1 text-[13px] text-muted">
                                {book.authors || 'Autor desconhecido'}
                            </div>
                            {book.status_label && (
                                <span className="self-start rounded-[10px] bg-elevated px-2 py-0.5 font-mono text-[11px]">
                                    {book.status_label}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            ) : (
                <EmptyLibrary filtered={total > 0} />
            )}
        </>
    );
}

function EmptyLibrary({ filtered }: { filtered: boolean }) {
    return (
        <div className="flex flex-col items-start gap-4 rounded-md border bg-surface p-6">
            <p className="font-mono text-sm text-muted">
                {filtered
                    ? '## nenhum livro com esses filtros'
                    : '## sua biblioteca está vazia'}
            </p>
            {!filtered && (
                <Link href={addBook.url()} className={buttonClass()}>
                    <PlusIcon /> Adicionar o primeiro livro
                </Link>
            )}
        </div>
    );
}
