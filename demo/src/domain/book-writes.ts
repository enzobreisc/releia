import { shortDate, translateText, type Replacements } from '@/lib/i18n';
import { dayOf } from '../support/day';
import { toIsbn10, toIsbn13 } from '../support/isbn';
import { sha1Hex } from '../support/sha1';
import type {
    AuthorRow,
    BookRow,
    DemoState,
    ReadingSessionRow,
} from '../state/types';
import { normalizeSearch } from '../support/names';
import { normalizeText } from './authors-identity';
import { removeRows } from './cascade';
import { bookRowOf } from './rows';
import { nextRowId } from './queue-writes';
import { localDateTime } from '../state/dates';
import { WriteRejected } from './reading-writes';

const MAX_PAGES = 20_000;
const HASH_LENGTH = 7;

/** The fields the book form sends. Blank text is null, as the app stores it. */
export type BookInput = {
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
};

function reject(
    state: DemoState,
    text: string,
    replacements?: Replacements,
): never {
    throw new WriteRejected(
        translateText(state.runtime.locale, text, replacements),
    );
}

function readingIdsOf(state: DemoState, bookId: number): Set<number> {
    return new Set(
        state.tables.readings
            .filter((reading) => reading.book_id === bookId)
            .map((reading) => reading.id),
    );
}

/** The session with the highest end page: the page total cannot fall below it. */
function highestSessionOf(
    state: DemoState,
    bookId: number,
): ReadingSessionRow | undefined {
    const readingIds = readingIdsOf(state, bookId);

    return state.tables.reading_sessions
        .filter((session) => readingIds.has(session.reading_id))
        .reduce<ReadingSessionRow | undefined>(
            (best, session) =>
                best === undefined ||
                session.page_to > best.page_to ||
                (session.page_to === best.page_to && session.id > best.id)
                    ? session
                    : best,
            undefined,
        );
}

function checkIsbn(
    state: DemoState,
    bookId: number,
    isbn13: string | null,
): void {
    if (isbn13 === null) {
        return;
    }

    if (toIsbn13(isbn13) === null) {
        reject(state, 'ISBN inválido.');
    }

    const other = state.tables.books.find(
        (book) => book.isbn_13 === isbn13 && book.id !== bookId,
    );

    if (other === undefined) {
        return;
    }

    const edition = [other.publisher, other.published_year]
        .filter((part) => part !== null && part !== '')
        .join(', ');
    const label = edition === '' ? other.title : `${other.title} (${edition})`;

    reject(state, 'Esse ISBN já é de outro livro da biblioteca: :book.', {
        book: label,
    });
}

function checkPages(
    state: DemoState,
    bookId: number,
    pages: number | null,
): void {
    if (pages !== null && (pages < 1 || pages > MAX_PAGES)) {
        reject(state, 'Número de páginas inválido.');
    }

    const highest = highestSessionOf(state, bookId);

    if (pages === null || highest === undefined || highest.page_to <= pages) {
        return;
    }

    reject(
        state,
        'O livro não pode ter menos que :pages páginas: a sessão :hash de :date vai até a p. :pages.',
        {
            pages: highest.page_to,
            hash: sha1Hex(String(highest.id)).slice(0, HASH_LENGTH),
            date: shortDate(state.runtime.locale, dayOf(highest.read_on)),
        },
    );
}

/** UpdateBookRequest: the rules the form enforces before the book is saved. */
function checkBookInput(
    state: DemoState,
    bookId: number,
    input: BookInput,
): void {
    if (input.title === '') {
        reject(state, 'Informe o título.');
    }

    checkIsbn(state, bookId, input.isbn13);
    checkPages(state, bookId, input.pages);
}

function createAuthor(state: DemoState, name: string): AuthorRow {
    const stamp = localDateTime(new Date());
    const author: AuthorRow = {
        id: nextRowId(state.tables.authors),
        name,
        open_library_key: null,
        photo_path: null,
        photo_looked_up_at: null,
        created_at: stamp,
        updated_at: stamp,
        photo_url: null,
    };

    state.tables.authors.push(author);

    return author;
}

/** Book::syncAuthors: a name that differs only by accents or case reuses the author already there. */
function syncAuthors(
    state: DemoState,
    bookId: number,
    names: readonly string[],
): AuthorRow[] {
    const authorsByKey = new Map(
        state.tables.authors.map((author) => [
            normalizeText(author.name),
            author,
        ]),
    );
    const positions = new Map<number, number>();

    [...new Set(names)].forEach((name, position) => {
        const key = normalizeText(name);
        const author = authorsByKey.get(key) ?? createAuthor(state, name);

        authorsByKey.set(key, author);
        positions.set(author.id, position);
    });

    state.tables.author_book = [
        ...state.tables.author_book.filter((link) => link.book_id !== bookId),
        ...[...positions].map(([authorId, position]) => ({
            author_id: authorId,
            book_id: bookId,
            position,
        })),
    ];

    return [...positions.keys()]
        .map((authorId) =>
            state.tables.authors.find((author) => author.id === authorId),
        )
        .filter((author): author is AuthorRow => author !== undefined);
}

function searchTextOf(book: BookRow, authorNames: readonly string[]): string {
    const parts = [
        book.title,
        book.subtitle,
        authorNames.join(' '),
        book.isbn_13,
        book.isbn_10,
    ];

    return normalizeSearch(
        parts.filter((part) => part !== null && part !== '').join(' '),
    );
}

type BookFields = Pick<
    BookRow,
    | 'title'
    | 'subtitle'
    | 'isbn_13'
    | 'isbn_10'
    | 'publisher'
    | 'published_year'
    | 'pages'
    | 'genre'
    | 'series'
    | 'series_position'
    | 'description'
>;

function bookFieldsOf(input: BookInput): BookFields {
    return {
        title: input.title,
        subtitle: input.subtitle,
        isbn_13: input.isbn13,
        isbn_10: input.isbn13 === null ? null : toIsbn10(input.isbn13),
        publisher: input.publisher,
        published_year: input.publishedYear,
        pages: input.pages,
        genre: input.genre,
        series: input.series,
        series_position: input.seriesPosition,
        description: input.description,
    };
}

function clampReadingPages(
    state: DemoState,
    bookId: number,
    pages: number | null,
): void {
    if (pages === null) {
        return;
    }

    for (const reading of state.tables.readings) {
        if (reading.book_id === bookId && reading.current_page > pages) {
            reading.current_page = pages;
            reading.updated_at = localDateTime(new Date());
        }
    }
}

/** LibraryService::update without the cover: the demo cannot store a new cover. */
export function updateBook(
    state: DemoState,
    bookId: number,
    input: BookInput,
): boolean {
    checkBookInput(state, bookId, input);

    const book = bookRowOf(state, bookId);
    const fields = bookFieldsOf(input);
    const changed = (Object.keys(fields) as (keyof BookFields)[]).some(
        (field) => book[field] !== fields[field],
    );

    Object.assign(book, fields);

    const authors = syncAuthors(state, bookId, input.authors);

    book.search_text = searchTextOf(
        book,
        authors.map((author) => author.name),
    );

    if (changed) {
        book.updated_at = localDateTime(new Date());
    }

    clampReadingPages(state, bookId, input.pages);

    return changed;
}

export function removeBook(state: DemoState, bookId: number): void {
    removeRows(state, 'books', new Set([bookId]));
}
