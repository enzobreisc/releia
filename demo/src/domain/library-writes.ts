import { toIsbn10 } from '../support/isbn';
import { normalizeSearch } from '../support/names';
import { localDateTime, localIsoDate } from '../state/dates';
import type {
    AuthorBookRow,
    AuthorRow,
    BookRow,
    BookSource,
    DemoState,
    ReadingRow,
    ReadingStatus,
} from '../state/types';
import { nextRowId } from './queue-writes';

export type NewBook = {
    title: string;
    subtitle: string | null;
    authors: string[];
    isbn13: string | null;
    publisher: string | null;
    publishedYear: number | null;
    pages: number | null;
    genre: string | null;
    series: string | null;
    seriesPosition: number | null;
    description: string | null;
    coverUrl: string | null;
    source: BookSource;
    status: ReadingStatus;
    finishedOn: string | null;
    undated: boolean;
};

type ReadingDates = { started: string | null; finished: string | null };

const START_OF_DAY = '00:00:00';
const NO_DATES: ReadingDates = { started: null, finished: null };
const COMBINING_MARKS = /\p{Mn}/gu;
const NON_ALPHANUMERIC = /[^a-z0-9 ]+/g;
const WHITESPACE_RUN = /\s+/g;

function dayAt(day: string): string {
    return `${day} ${START_OF_DAY}`;
}

/** Book::syncAuthors matches authors by their name without accents, case or punctuation. */
function authorKey(name: string): string {
    return name
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .toLowerCase()
        .replace(NON_ALPHANUMERIC, ' ')
        .replace(WHITESPACE_RUN, ' ')
        .trim();
}

function newAuthor(id: number, name: string, stamp: string): AuthorRow {
    return {
        id,
        name,
        open_library_key: null,
        photo_path: null,
        photo_looked_up_at: null,
        created_at: stamp,
        updated_at: stamp,
        photo_url: null,
    };
}

/** Links the book to its authors in the given order and returns their names in that order. */
function linkAuthors(
    state: DemoState,
    bookId: number,
    names: readonly string[],
    stamp: string,
): string[] {
    const { tables } = state;
    const authorsByKey = new Map<string, AuthorRow>();

    for (const author of tables.authors) {
        authorsByKey.set(authorKey(author.name), author);
    }

    const positions = new Map<number, number>();
    const namesById = new Map<number, string>();

    [...new Set(names)].forEach((name, position) => {
        const key = authorKey(name);
        let author = authorsByKey.get(key);

        if (author === undefined) {
            author = newAuthor(nextRowId(tables.authors), name, stamp);
            tables.authors.push(author);
            authorsByKey.set(key, author);
        }

        positions.set(author.id, position);
        namesById.set(author.id, author.name);
    });

    const links: AuthorBookRow[] = [...positions].map(
        ([authorId, position]) => ({
            author_id: authorId,
            book_id: bookId,
            position,
        }),
    );

    tables.author_book.push(...links);

    return [...positions]
        .sort(([, left], [, right]) => left - right)
        .map(([authorId]) => namesById.get(authorId) ?? '');
}

function searchTextOf(book: BookRow, authorNames: readonly string[]): string {
    return normalizeSearch(
        [
            book.title,
            book.subtitle,
            authorNames.join(' '),
            book.isbn_13,
            book.isbn_10,
        ]
            .filter((part): part is string => part !== null && part !== '')
            .join(' '),
    );
}

/** The dates ReadingService::changeStatus gives a new reading: "today" is the day it is added. */
function datesFor(status: ReadingStatus, today: string): ReadingDates {
    switch (status) {
        case 'want_to_read':
            return NO_DATES;
        case 'reading':
            return { started: dayAt(today), finished: null };
        case 'read':
        case 'abandoned':
            return { started: dayAt(today), finished: dayAt(today) };
    }
}

/** LibraryService::add: a book read before the app has the date typed in, or none when "undated". */
function datesOf(input: NewBook, today: string): ReadingDates {
    if (input.status !== 'read') {
        return datesFor(input.status, today);
    }

    if (input.undated) {
        return NO_DATES;
    }

    const finishedOn = input.finishedOn ?? today;

    return { started: dayAt(finishedOn), finished: dayAt(finishedOn) };
}

function currentPageOf(input: NewBook): number {
    return input.status === 'read' ? (input.pages ?? 0) : 0;
}

function newReading(
    state: DemoState,
    book: BookRow,
    input: NewBook,
    today: string,
    stamp: string,
): ReadingRow {
    const dates = datesOf(input, today);

    return {
        id: nextRowId(state.tables.readings),
        book_id: book.id,
        status: input.status,
        started_at: dates.started,
        finished_at: dates.finished,
        current_page: currentPageOf(input),
        rating: null,
        review: null,
        abandon_reason: null,
        created_at: stamp,
        updated_at: stamp,
    };
}

function bookRowOf(id: number, input: NewBook, stamp: string): BookRow {
    return {
        id,
        isbn_13: input.isbn13,
        isbn_10: input.isbn13 === null ? null : toIsbn10(input.isbn13),
        title: input.title,
        subtitle: input.subtitle,
        publisher: input.publisher,
        published_year: input.publishedYear,
        pages: input.pages,
        genre: input.genre,
        description: input.description,
        cover_path: input.coverUrl === null ? null : `covers/${id}.jpg`,
        source: input.source,
        search_text: '',
        series: input.series,
        series_position: input.seriesPosition,
        shelf_position: null,
        bookshelf_id: null,
        is_lying_down: 0,
        created_at: stamp,
        updated_at: stamp,
        cover_url: input.coverUrl,
    };
}

/**
 * LibraryService::add: the book, its authors and its first reading, with the status and dates
 * the form gave. Adding a book never touches the queue, as in the app.
 */
export function addBook(state: DemoState, input: NewBook, now: Date): BookRow {
    const stamp = localDateTime(now);
    const today = localIsoDate(now);
    const book = bookRowOf(nextRowId(state.tables.books), input, stamp);

    state.tables.books.push(book);

    const authorNames = linkAuthors(state, book.id, input.authors, stamp);

    book.search_text = searchTextOf(book, authorNames);
    state.tables.readings.push(newReading(state, book, input, today, stamp));

    return book;
}
