import { Link, router } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { IconButton } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { show as bookShow } from '@/routes/books';
import { destroy as unpinBook } from '@/routes/profile/pins';
import type { PinnedBook } from './types';

export function PinnedCard({
    book,
    editing,
}: {
    book: PinnedBook;
    editing: boolean;
}) {
    const { t } = useTranslation();

    return (
        <article
            className={cardClass('relative flex items-center gap-3.5 p-3.5')}
        >
            <Link href={bookShow.url(book.id)} className="shrink-0">
                <BookCover
                    src={book.cover_url}
                    title={book.title}
                    className="w-11"
                />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                    href={bookShow.url(book.id)}
                    className={cn(
                        'truncate text-[15px] font-extrabold hover:underline',
                        editing && 'pr-8',
                    )}
                >
                    {book.title}
                </Link>
                <span className="truncate text-xs font-medium text-muted">
                    {book.authors || t('Autor desconhecido')}
                </span>
                {book.rating !== null && (
                    <span
                        aria-label={t('Nota :rating de 5', {
                            rating: book.rating,
                        })}
                        className="text-xs tracking-widest text-text"
                    >
                        {'★'.repeat(book.rating)}
                        {'☆'.repeat(5 - book.rating)}
                    </span>
                )}
            </div>
            {editing && (
                <IconButton
                    label={t('Desafixar :title', { title: book.title })}
                    variant="plain"
                    onClick={() =>
                        router.delete(unpinBook.url(book.id), {
                            preserveScroll: true,
                        })
                    }
                    className="absolute top-2 right-2 size-8"
                >
                    ×
                </IconButton>
            )}
        </article>
    );
}
