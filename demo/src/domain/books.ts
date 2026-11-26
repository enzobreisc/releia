import type { AuthorRow, BookRow, ReadingRow } from '../state/types';
import type { ReadModel } from './read-model';

/** Book::findOrFail: a book that is referenced must exist. */
export function bookOf(model: ReadModel, bookId: number): BookRow {
    const book = model.bookById.get(bookId);

    if (book === undefined) {
        throw new Error(`Book ${bookId} is not in the demo state.`);
    }

    return book;
}

export function authorsOf(model: ReadModel, bookId: number): AuthorRow[] {
    return model.authorsByBook.get(bookId) ?? [];
}

export function authorNamesOf(model: ReadModel, bookId: number): string {
    return authorsOf(model, bookId)
        .map((author) => author.name)
        .join(', ');
}

export function currentReadingOf(
    model: ReadModel,
    bookId: number,
): ReadingRow | null {
    return model.currentReadingByBook.get(bookId) ?? null;
}

export function readingsOfBook(model: ReadModel, bookId: number): ReadingRow[] {
    return model.readingsByBook.get(bookId) ?? [];
}

export function isInQueue(model: ReadModel, bookId: number): boolean {
    return model.queuedBookIds.has(bookId);
}

/** Books keep a cover only when one was stored; the export holds its remote address. */
export function bookCoverUrl(book: BookRow): string | null {
    return book.cover_path === null ? null : book.cover_url;
}
