import { Link } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { StatusBadge } from '@/components/status';
import { show as bookShow } from '@/routes/books';
import type { SpineBook } from '@/types';

const MAX_RATING = 5;
const STAR = '★';

export function OwnedBook({ book }: { book: SpineBook }) {
    const stars = book.status === 'read' ? (book.rating ?? 0) : 0;

    return (
        <Link href={bookShow.url(book.id)} className="flex items-end gap-4.5">
            <BookCover
                src={book.cover_url}
                title={book.title}
                className="w-30"
            />
            <span className="flex min-w-0 flex-col gap-1 pb-1">
                <span className="text-lg font-extrabold">{book.title}</span>
                {book.status && book.status_label && (
                    <span className="flex items-center gap-2">
                        <StatusBadge
                            status={book.status}
                            label={book.status_label}
                        />
                        {stars > 0 && (
                            <span
                                aria-label={`${stars}/${MAX_RATING}`}
                                className="text-xs font-bold text-secondary"
                            >
                                {STAR.repeat(stars)}
                            </span>
                        )}
                    </span>
                )}
            </span>
        </Link>
    );
}
