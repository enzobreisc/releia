import { Link } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { FIRST_READING_NUMBER } from '@/components/book/constants';
import { StatusActions } from '@/components/book/status-actions';
import { DisplayTitle } from '@/components/page-header';
import type { Status } from '@/components/status';
import type { DialogState } from '@/hooks/use-book-dialogs';
import { useTranslation } from '@/hooks/use-translation';
import { show as authorShow } from '@/routes/authors';
import type { BookDetail, ReadingHistory } from '@/types';

export function BookHeader({
    book,
    status,
    current,
    previous,
    queuePosition,
    canMoveToShopping,
    onOpenDialog,
    onEdit,
}: {
    book: BookDetail;
    status: Status;
    current: ReadingHistory | null;
    previous: ReadingHistory | null;
    queuePosition: number | null;
    canMoveToShopping: boolean;
    onOpenDialog: (dialog: DialogState) => void;
    onEdit: () => void;
}) {
    const { t, monthYear, translateText, ordinal } = useTranslation();
    const number = current?.number ?? FIRST_READING_NUMBER;
    const facts = [
        book.pages && t(':pages págs', { pages: book.pages }),
        book.publisher,
        book.published_year,
        book.genre && translateText(book.genre),
        book.isbn_13 && `ISBN ${book.isbn_13}`,
    ].filter(Boolean);

    return (
        <header className="flex flex-wrap items-end gap-12">
            <BookCover
                src={book.cover_url}
                title={book.title}
                className="w-60 shadow-hero"
            />
            <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-4.5 pb-1">
                {number > 1 && previous && (
                    <span className="inline-flex h-7.5 items-center gap-2 self-start rounded-full bg-elevated px-3 text-xs font-bold text-secondary inset-ring inset-ring-strong">
                        <span className="font-mono">↻</span>
                        {t(':ordinal leitura · a :previous foi em :date', {
                            ordinal: ordinal(number, 'feminine'),
                            previous: ordinal(previous.number, 'feminine'),
                            date: previous.finished_at
                                ? monthYear(previous.finished_at)
                                : '—',
                        })}
                        {previous.rating ? `, ★${previous.rating}` : ''}
                    </span>
                )}
                <div className="flex flex-col gap-2.5">
                    <DisplayTitle>{book.title}</DisplayTitle>
                    {book.subtitle && (
                        <p className="text-[17px] font-medium text-muted">
                            {book.subtitle}
                        </p>
                    )}
                    <p className="text-xl font-semibold text-secondary">
                        {book.author_links.length === 0
                            ? t('Autor desconhecido')
                            : book.author_links.map((author, index) => (
                                  <span key={author.id}>
                                      {index > 0 && ', '}
                                      <Link
                                          href={authorShow.url(author.id)}
                                          className="hover:text-link hover:underline"
                                      >
                                          {author.name}
                                      </Link>
                                  </span>
                              ))}
                    </p>
                </div>

                {facts.length > 0 && (
                    <p className="flex flex-wrap gap-x-4.5 gap-y-1.5 font-mono text-xs text-muted">
                        {facts.map((fact, index) => (
                            <span key={index}>{fact}</span>
                        ))}
                    </p>
                )}

                <StatusActions
                    book={book}
                    status={status}
                    current={current}
                    queuePosition={queuePosition}
                    canMoveToShopping={canMoveToShopping}
                    onOpenDialog={onOpenDialog}
                    onEdit={onEdit}
                />
            </div>
        </header>
    );
}
