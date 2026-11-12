import { Link } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { useTranslation } from '@/hooks/use-translation';
import { show as showBook } from '@/routes/books';
import { index as libraryIndex } from '@/routes/library';
import type { RecentBook } from '@/types';

export function RecentlyFinished({ books }: { books: RecentBook[] }) {
    const { t, plural, shortDate } = useTranslation();

    return (
        <section
            aria-labelledby="finished-title"
            className="flex flex-col gap-4"
        >
            <div className="flex items-baseline justify-between gap-3">
                <h2
                    id="finished-title"
                    className="text-xl font-extrabold tracking-tight"
                >
                    {t('Últimos terminados')}
                </h2>
                <Link
                    href={libraryIndex.url()}
                    className="text-[13px] font-bold text-link hover:underline"
                >
                    {t('Ver biblioteca')}
                </Link>
            </div>
            {books.length === 0 ? (
                <p className="text-sm text-muted">
                    {t('Os livros que você terminar aparecem aqui.')}
                </p>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {books.map((book) => (
                        <Link
                            key={book.id}
                            href={showBook(book.id).url}
                            className="flex max-w-32 min-w-24 flex-1 basis-24 flex-col gap-2.5"
                        >
                            <BookCover
                                src={book.cover_url}
                                title={book.title}
                                className="w-full"
                            />
                            <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-[13px] font-bold">
                                    {book.title}
                                </span>
                                <span className="truncate text-xs font-medium text-muted">
                                    {book.authors}
                                </span>
                                {book.finished_at && (
                                    <span className="mt-0.5 font-mono text-[11px] text-secondary">
                                        {shortDate(book.finished_at)}
                                        {book.days !== null &&
                                            ` · ${plural(book.days, 'dia', 'dias')}`}
                                    </span>
                                )}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}
