import type { AuthorIndexEntry, SpineBook } from '@/types';
import { bookCoverUrl } from '../domain/books';
import {
    authorStats,
    authorsWithBooks,
    booksOfSameAuthor,
    isReadBook,
    totalPagesRead,
} from '../domain/authors';
import type { AuthorRow, BookRow } from '../state/types';
import type { ReadModel } from '../domain/read-model';
import { spineBook } from './books';

type AuthorsIndexProps = {
    authors: AuthorIndexEntry[];
    authors_with_read_books: number;
};

type AuthorPageProps = {
    author: { id: number; name: string; photo_url: string | null };
    books: SpineBook[];
};

function indexEntry(
    model: ReadModel,
    author: AuthorRow,
    totalPages: number,
): AuthorIndexEntry {
    const stats = authorStats(model, author, totalPages);

    return {
        id: author.id,
        name: author.name,
        photo_url: author.photo_url,
        owned: stats.owned,
        read: stats.read,
        pages_read: stats.pagesRead,
        average_rating: stats.averageRating,
        reading_share: stats.readingShare,
        last_finished_title: stats.lastFinishedTitle,
        books: stats.books.map((book: BookRow) => ({
            id: book.id,
            title: book.title,
            cover_url: bookCoverUrl(book),
            is_read: isReadBook(model, book),
        })),
    };
}

/** AuthorIndex::build: every author with books, with the reading summary of each. */
export function authorsIndexProps(model: ReadModel): AuthorsIndexProps {
    const totalPages = totalPagesRead(model);
    const authors = authorsWithBooks(model).map((author) =>
        indexEntry(model, author, totalPages),
    );

    return {
        authors,
        authors_with_read_books: authors.filter((entry) => entry.read > 0)
            .length,
    };
}

/** AuthorController::show, without the works, which the page asks for separately. */
export function authorPageProps(
    model: ReadModel,
    author: AuthorRow,
): AuthorPageProps {
    return {
        author: {
            id: author.id,
            name: author.name,
            photo_url: author.photo_url,
        },
        books: booksOfSameAuthor(model, author).map((book) =>
            spineBook(model, book),
        ),
    };
}
