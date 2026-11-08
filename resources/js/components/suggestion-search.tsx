import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { Button, Input } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { show, store } from '@/routes/books';
import { index } from '@/routes/suggestions';
import type { Candidate } from '@/types';

export function SuggestionSearchForm({ query }: { query: string }) {
    const { t } = useTranslation();
    const [text, setText] = useState(query);

    const search = (event: FormEvent) => {
        event.preventDefault();
        const trimmed = text.trim();

        router.get(
            index(trimmed === '' ? {} : { query: { q: trimmed } }),
            {},
            { preserveScroll: true, replace: true },
        );
    };

    const clear = () => {
        setText('');
        router.get(index(), {}, { replace: true });
    };

    return (
        <form
            role="search"
            onSubmit={search}
            className="flex flex-wrap items-center gap-2"
        >
            <Input
                type="search"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t('Ex.: Gogol, Tolstói, literatura russa')}
                aria-label={t('Buscar autor, título ou assunto')}
                className="min-w-0 flex-[1_1_280px]"
            />
            <Button type="submit">{t('Buscar')}</Button>
            {query !== '' && (
                <Button type="button" variant="ghost" onClick={clear}>
                    {t('Limpar busca')}
                </Button>
            )}
        </form>
    );
}

export function SuggestionSearchResults({
    query,
    results,
}: {
    query: string;
    results: Candidate[];
}) {
    const { t } = useTranslation();

    return (
        <section
            aria-labelledby="search-results"
            className="flex flex-col gap-3.5"
        >
            <h2 id="search-results">
                <SectionTitle>
                    {t('Resultados para “:query” · :count', {
                        query,
                        count: results.length,
                    })}
                </SectionTitle>
            </h2>
            {results.length === 0 ? (
                <p className={cardClass('p-5 text-sm text-muted')}>
                    {t('Nenhum livro encontrado para essa busca.')}
                </p>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-3.5">
                    {results.map((book, position) => (
                        <ResultCard
                            key={`${position}-${book.title}`}
                            book={book}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function ResultCard({ book }: { book: Candidate }) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState(false);

    const add = (status: 'want_to_read' | 'read') =>
        router.post(
            store(),
            { ...book, status },
            { onStart: () => setBusy(true), onFinish: () => setBusy(false) },
        );

    return (
        <article className={cardClass('flex flex-col gap-3.5 p-4.5')}>
            <div className="flex gap-4">
                <BookCover
                    src={book.cover_url}
                    title={book.title}
                    className="w-16"
                />
                <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-[17px] font-extrabold">{book.title}</h3>
                    {book.authors.length > 0 && (
                        <p className="text-[13px] font-semibold text-secondary">
                            {book.authors.join(', ')}
                        </p>
                    )}
                    {book.published_year && (
                        <p className="font-mono text-xs text-muted">
                            {book.published_year}
                        </p>
                    )}
                </div>
            </div>
            {book.library_id === null ? (
                <div className="flex flex-wrap gap-2">
                    <Button
                        className="h-10"
                        disabled={busy}
                        onClick={() => add('want_to_read')}
                    >
                        {t('Quero ler')}
                    </Button>
                    <Button
                        variant="ghost"
                        className="h-10"
                        disabled={busy}
                        onClick={() => add('read')}
                    >
                        {t('Já li')}
                    </Button>
                </div>
            ) : (
                <Link
                    href={show(book.library_id).url}
                    className="self-start text-[13px] font-bold text-link hover:underline"
                >
                    {t('Já está na biblioteca')}
                </Link>
            )}
        </article>
    );
}
