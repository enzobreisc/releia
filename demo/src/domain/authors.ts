import type { AuthorRow, BookRow } from '../state/types';
import { asciiLowerCase, compareText } from '../support/collections';
import { phpRound } from '../support/php-round';
import { currentReadingOf } from './books';
import type { ReadModel } from './read-model';

const RATING_DECIMALS = 1;
const PERCENT = 100;

type AuthorStats = {
    books: BookRow[];
    owned: number;
    read: number;
    pagesRead: number;
    averageRating: number | null;
    readingShare: number | null;
    lastFinishedTitle: string | null;
};

/** Sorts names the way SQLite's NOCASE does: only ASCII letters ignore case. */
function uniqueById(books: readonly BookRow[]): BookRow[] {
    return [...new Map(books.map((book) => [book.id, book])).values()];
}

export function authorOf(model: ReadModel, authorId: number): AuthorRow | null {
    return (
        model.state.tables.authors.find((author) => author.id === authorId) ??
        null
    );
}

export function booksOfAuthor(model: ReadModel, authorId: number): BookRow[] {
    return model.state.tables.author_book
        .filter((link) => link.author_id === authorId)
        .flatMap((link) => {
            const book = model.bookById.get(link.book_id);

            return book === undefined ? [] : [book];
        })
        .sort((left, right) => left.id - right.id);
}

export function isReadBook(model: ReadModel, book: BookRow): boolean {
    return currentReadingOf(model, book.id)?.status === 'read';
}

/** Authors with at least one book, by name. */
export function authorsWithBooks(model: ReadModel): AuthorRow[] {
    return model.state.tables.authors
        .filter((author) => booksOfAuthor(model, author.id).length > 0)
        .sort((left, right) =>
            compareText(asciiLowerCase(left.name), asciiLowerCase(right.name)),
        );
}

function pagesReadOf(model: ReadModel, books: readonly BookRow[]): number {
    return books
        .filter((book) => isReadBook(model, book))
        .reduce((total, book) => total + (book.pages ?? 0), 0);
}

export function totalPagesRead(model: ReadModel): number {
    const books = uniqueById(
        authorsWithBooks(model).flatMap((author) =>
            booksOfAuthor(model, author.id),
        ),
    );

    return pagesReadOf(model, books);
}

/** Ratings count when they are not zero, as the PHP collection filter drops falsy values. */
function averageRatingOf(
    model: ReadModel,
    books: readonly BookRow[],
): number | null {
    const ratings = books.flatMap((book) => {
        const rating = currentReadingOf(model, book.id)?.rating;

        return rating ? [rating] : [];
    });

    if (ratings.length === 0) {
        return null;
    }

    const total = ratings.reduce((sum, rating) => sum + rating, 0);

    return phpRound(total / ratings.length, RATING_DECIMALS);
}

function finishedOn(model: ReadModel, book: BookRow): string {
    return currentReadingOf(model, book.id)?.finished_at ?? '';
}

function readingIdOf(model: ReadModel, book: BookRow): number {
    return currentReadingOf(model, book.id)?.id ?? 0;
}

/** The book whose current reading finished last; ties go to the newer reading. */
function lastFinishedBook(
    model: ReadModel,
    books: readonly BookRow[],
): BookRow | null {
    const [latest] = [...books].sort(
        (left, right) =>
            compareText(finishedOn(model, right), finishedOn(model, left)) ||
            readingIdOf(model, right) - readingIdOf(model, left),
    );

    return latest ?? null;
}

/** Owned books: read ones first, then by title. */
function shelfOrder(model: ReadModel, left: BookRow, right: BookRow): number {
    return (
        Number(isReadBook(model, right)) - Number(isReadBook(model, left)) ||
        compareText(left.title, right.title)
    );
}

export function authorStats(
    model: ReadModel,
    author: AuthorRow,
    totalPages: number,
): AuthorStats {
    const books = booksOfAuthor(model, author.id);
    const readBooks = books.filter((book) => isReadBook(model, book));
    const pagesRead = pagesReadOf(model, readBooks);

    return {
        books: [...books].sort((left, right) => shelfOrder(model, left, right)),
        owned: books.length,
        read: readBooks.length,
        pagesRead,
        averageRating: averageRatingOf(model, readBooks),
        readingShare:
            totalPages === 0
                ? null
                : phpRound((pagesRead / totalPages) * PERCENT),
        lastFinishedTitle: lastFinishedBook(model, readBooks)?.title ?? null,
    };
}

/** The author's own id, plus every record that shares one of its Open Library keys. */
function sameAuthorIds(model: ReadModel, author: AuthorRow): number[] {
    if (author.open_library_key === null) {
        return [author.id];
    }

    const keys = author.open_library_key.split(',');

    return model.state.tables.authors
        .filter(
            (other) =>
                other.id === author.id ||
                keys.some((key) =>
                    (other.open_library_key ?? '').includes(key),
                ),
        )
        .map((other) => other.id);
}

function publishedYearOrder(left: BookRow, right: BookRow): number {
    const unknownOrder =
        Number(left.published_year === null) -
        Number(right.published_year === null);

    return (
        unknownOrder ||
        (left.published_year ?? 0) - (right.published_year ?? 0) ||
        compareText(left.title, right.title)
    );
}

/** Books of every record of the author, earliest published first; unknown years last. */
export function booksOfSameAuthor(
    model: ReadModel,
    author: AuthorRow,
): BookRow[] {
    const books = uniqueById(
        sameAuthorIds(model, author).flatMap((id) => booksOfAuthor(model, id)),
    );

    return books.sort(publishedYearOrder);
}
