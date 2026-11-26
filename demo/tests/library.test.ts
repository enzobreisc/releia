import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test';
import type { HttpMethod } from '../src/server/router';
import { getState } from '../src/state/store';
import type { BookRow, BookshelfRow } from '../src/state/types';
import {
    resetDemoState,
    restoreClock,
    sendRequest,
    type ServedResponse,
} from './harness';

type LibraryRow = {
    title: string;
    shelf_rank: number;
    bookshelf_id: number | null;
};

const TORTO_ARADO = 1;
const SAPIENS = 2;
const CLEAN_CODE = 3;
const DOM_CASMURRO = 4;
const O_HOBBIT = 6;
const REFACTORING = 9;
const MEMORIAS = 10;
const FICCAO_SHELF = 1;
const TECNOLOGIA_SHELF = 2;
const FANTASIA_SHELF = 3;
const CATCH_ALL_SHELF = 4;

afterAll(() => {
    restoreClock();
});

beforeEach(() => {
    resetDemoState({ locale: 'en' });
});

function send(
    method: HttpMethod,
    url: string,
    body?: Record<string, unknown>,
): ServedResponse {
    return sendRequest({ method, url, body });
}

function isLibraryRow(value: unknown): value is LibraryRow {
    return (
        typeof value === 'object' &&
        value !== null &&
        'title' in value &&
        typeof value.title === 'string' &&
        'shelf_rank' in value &&
        typeof value.shelf_rank === 'number' &&
        'bookshelf_id' in value
    );
}

function libraryRowsOf(response: ServedResponse): LibraryRow[] {
    const books = response.page?.props.books;

    if (!Array.isArray(books) || !books.every(isLibraryRow)) {
        throw new Error('The response carries no library books.');
    }

    return books;
}

function titlesOf(response: ServedResponse): string[] {
    return libraryRowsOf(response).map((row) => row.title);
}

function requireBook(id: number): BookRow {
    const book = getState().tables.books.find((row) => row.id === id);

    if (book === undefined) {
        throw new Error(`Book ${id} is missing from the demo state.`);
    }

    return book;
}

function shelvesNow(): BookshelfRow[] {
    return getState().tables.bookshelves;
}

function shelfNames(): string[] {
    return shelvesNow().map((shelf) => shelf.name);
}

function toastTitleOf(response: ServedResponse): string | undefined {
    const toast = response.page?.props.toast;

    return typeof toast === 'object' &&
        toast !== null &&
        'title' in toast &&
        typeof toast.title === 'string'
        ? toast.title
        : undefined;
}

function titlesInShelfOrder(): string[] {
    const { books } = getState().tables;

    return [...books]
        .filter((book) => book.shelf_position !== null)
        .sort(
            (left, right) =>
                (left.shelf_position ?? 0) - (right.shelf_position ?? 0),
        )
        .map((book) => book.title);
}

describe('library filters', () => {
    it('keeps the books whose search text holds every term, ignoring case and accents', () => {
        expect(
            titlesOf(
                send(
                    'GET',
                    `/library?q=${encodeURIComponent('  MACHADO   casmurro ')}`,
                ),
            ),
        ).toEqual(['Dom Casmurro']);
        expect(
            titlesOf(
                send('GET', `/library?q=${encodeURIComponent('machado')}`),
            ),
        ).toEqual(['Memórias Póstumas de Brás Cubas', 'Dom Casmurro']);
        expect(
            titlesOf(
                send('GET', `/library?q=${encodeURIComponent('Lispéctor')}`),
            ),
        ).toEqual(['A Hora da Estrela']);
    });

    it('treats the wildcard characters of a search term as wildcards', () => {
        expect(
            titlesOf(
                send('GET', `/library?q=${encodeURIComponent('torto_arad%')}`),
            ),
        ).toEqual(['Torto Arado']);
    });

    it('filters by genre exactly', () => {
        const response = send(
            'GET',
            `/library?genre=${encodeURIComponent('Tecnologia')}`,
        );

        expect(response.page?.props.filters).toMatchObject({
            genre: 'Tecnologia',
        });
        expect(titlesOf(response)).toEqual(['Refactoring', 'Clean Code']);
        expect(
            titlesOf(
                send(
                    'GET',
                    `/library?genre=${encodeURIComponent('tecnologia')}`,
                ),
            ),
        ).toEqual([]);
    });

    it('filters by the shelf of the most recent reading and ignores an unknown shelf', () => {
        const read = titlesOf(send('GET', '/library?shelf=read'));

        expect(read).toEqual([
            'O Alquimista',
            'Histórias Extraordinárias',
            'O Hobbit',
            'Pequeno Manual Antirracista',
            'Dom Casmurro',
            'Clean Code',
            'Sapiens',
            'Torto Arado',
        ]);

        const unknown = send('GET', '/library?shelf=lost');

        expect(unknown.page?.props.filters).toMatchObject({ shelf: null });
        expect(titlesOf(unknown)).toHaveLength(getState().tables.books.length);
    });

    it('ranks every book in the full line, even when the list is filtered', () => {
        send('PATCH', `/library/${CLEAN_CODE}/position`, {
            before_book_id: DOM_CASMURRO,
        });

        const rows = libraryRowsOf(
            send('GET', `/library?genre=${encodeURIComponent('Tecnologia')}`),
        );

        expect(rows.find((row) => row.title === 'Clean Code')?.shelf_rank).toBe(
            0,
        );
        expect(
            rows.find((row) => row.title === 'Refactoring')?.shelf_rank,
        ).toBe(4);
    });
});

describe('bookcase setup', () => {
    it('replaces the bookcase with one shelf per known group and a catch-all', () => {
        const response = send('POST', '/library/bookcase/setup', {
            grouping: 'publisher',
            shelves: [
                { name: '  Rocco  ', group_keys: ['rocco', 'unknown'] },
                { name: 'Ghost', group_keys: ['unknown'] },
            ],
            catch_all_name: ' Outros ',
        });

        expect(response.page?.url).toBe('/library');
        expect(toastTitleOf(response)).toBe('Bookcase built');
        expect(shelvesNow()).toEqual([
            expect.objectContaining({
                id: 5,
                name: 'Rocco',
                position: 0,
                grouping: 'publisher',
                group_keys: '["rocco"]',
                is_catch_all: 0,
            }),
            expect.objectContaining({
                id: 6,
                name: 'Outros',
                position: 1,
                grouping: null,
                group_keys: null,
                is_catch_all: 1,
            }),
        ]);
    });

    it('discards the hand-made placements and order of the previous bookcase', () => {
        send('PATCH', `/library/${TORTO_ARADO}/position`, {
            before_book_id: null,
            bookshelf_id: TECNOLOGIA_SHELF,
        });

        send('POST', '/library/bookcase/setup', {
            grouping: 'publisher',
            shelves: [{ name: 'Rocco', group_keys: ['rocco'] }],
            catch_all_name: 'Outros',
        });

        expect(requireBook(TORTO_ARADO)).toMatchObject({
            bookshelf_id: null,
            shelf_position: null,
        });
    });

    it('does not save an invalid setup', () => {
        const before = shelfNames();

        send('POST', '/library/bookcase/setup', {
            grouping: 'colour',
            shelves: [],
            catch_all_name: 'Outros',
        });

        expect(shelfNames()).toEqual(before);
    });
});

describe('bookshelf writes', () => {
    it('adds a shelf with a trimmed name at the end, and refuses a blank name', () => {
        send('POST', '/bookshelves', { name: '  Favoritos ' });
        send('POST', '/bookshelves', { name: '   ' });

        expect(shelvesNow().at(-1)).toMatchObject({
            name: 'Favoritos',
            position: 4,
            is_catch_all: 0,
        });
        expect(shelvesNow()).toHaveLength(5);
    });

    it('renames a shelf and leaves its groups alone', () => {
        const response = send('PATCH', `/bookshelves/${FANTASIA_SHELF}`, {
            name: 'Preferidos',
        });

        expect(response.status).toBe(200);
        expect(
            shelvesNow().find((shelf) => shelf.id === FANTASIA_SHELF),
        ).toMatchObject({
            name: 'Preferidos',
            group_keys: '["fantasia"]',
        });
    });

    it('answers 404 when the shelf to rename does not exist', () => {
        expect(send('PATCH', '/bookshelves/99', { name: 'Nope' }).status).toBe(
            404,
        );
    });

    it('removes a shelf and sends its hand-placed books back to their group', () => {
        send('PATCH', `/library/${TORTO_ARADO}/position`, {
            before_book_id: null,
            bookshelf_id: FANTASIA_SHELF,
        });
        expect(requireBook(TORTO_ARADO).bookshelf_id).toBe(FANTASIA_SHELF);

        const response = send('DELETE', `/bookshelves/${FANTASIA_SHELF}`);

        expect(toastTitleOf(response)).toBe('Shelf deleted');
        expect(shelvesNow().some((shelf) => shelf.id === FANTASIA_SHELF)).toBe(
            false,
        );
        expect(requireBook(TORTO_ARADO).bookshelf_id).toBeNull();
    });

    it('refuses to remove the catch-all shelf', () => {
        const response = send('DELETE', `/bookshelves/${CATCH_ALL_SHELF}`);

        expect(response.status).toBe(422);
        expect(shelvesNow()).toHaveLength(4);
    });

    it('merges a shelf into another: groups and hand-placed books move to the kept shelf', () => {
        send('PATCH', `/library/${CLEAN_CODE}/position`, {
            before_book_id: null,
            bookshelf_id: TECNOLOGIA_SHELF,
        });

        const response = send('POST', `/bookshelves/${FICCAO_SHELF}/merge`, {
            absorbed_id: TECNOLOGIA_SHELF,
        });

        expect(toastTitleOf(response)).toBe('Shelves merged');
        expect(shelvesNow().map((shelf) => shelf.id)).toEqual([
            FICCAO_SHELF,
            FANTASIA_SHELF,
            CATCH_ALL_SHELF,
        ]);
        expect(shelvesNow()[0]).toMatchObject({
            group_keys: '["ficcao","tecnologia"]',
            grouping: 'genre',
        });
        expect(requireBook(CLEAN_CODE).bookshelf_id).toBe(FICCAO_SHELF);
    });

    it('refuses to merge the catch-all shelf, or a shelf into itself, without changing anything', () => {
        expect(
            send('POST', `/bookshelves/${FICCAO_SHELF}/merge`, {
                absorbed_id: CATCH_ALL_SHELF,
            }).status,
        ).toBe(422);
        send('POST', `/bookshelves/${FICCAO_SHELF}/merge`, {
            absorbed_id: FICCAO_SHELF,
        });

        expect(shelvesNow()).toHaveLength(4);
        expect(shelvesNow()[0]?.group_keys).toBe('["ficcao"]');
    });
});

describe('moving books', () => {
    it('drops a book right before the target', () => {
        send('PATCH', `/library/${TORTO_ARADO}/position`, {
            before_book_id: SAPIENS,
        });

        expect(titlesInShelfOrder().slice(3, 6)).toEqual([
            'Refactoring',
            'Torto Arado',
            'Sapiens',
        ]);
    });

    it('drops a book at the end when there is no target', () => {
        send('PATCH', `/library/${DOM_CASMURRO}/position`, {
            before_book_id: null,
        });

        expect(titlesInShelfOrder().at(-1)).toBe('Dom Casmurro');
        expect(titlesInShelfOrder()).toHaveLength(
            getState().tables.books.length,
        );
    });

    it('changes nothing when a book is dropped on itself', () => {
        send('PATCH', `/library/${TORTO_ARADO}/position`, {
            before_book_id: TORTO_ARADO,
        });

        expect(requireBook(TORTO_ARADO).shelf_position).toBeNull();
    });

    it('places a book on a shelf when the request names one, and clears it on null', () => {
        send('PATCH', `/library/${O_HOBBIT}/position`, {
            before_book_id: null,
            bookshelf_id: FICCAO_SHELF,
        });
        expect(requireBook(O_HOBBIT).bookshelf_id).toBe(FICCAO_SHELF);

        send('PATCH', `/library/${O_HOBBIT}/position`, {
            before_book_id: null,
            bookshelf_id: null,
        });
        expect(requireBook(O_HOBBIT).bookshelf_id).toBeNull();
    });

    it('keeps the shelf of a book when the request does not name one', () => {
        send('PATCH', `/library/${O_HOBBIT}/position`, {
            before_book_id: null,
            bookshelf_id: FICCAO_SHELF,
        });

        send('PATCH', `/library/${O_HOBBIT}/position`, {
            before_book_id: SAPIENS,
        });

        expect(requireBook(O_HOBBIT).bookshelf_id).toBe(FICCAO_SHELF);
    });

    it('leaves updated_at alone, since it versions the cover url', () => {
        const before = requireBook(TORTO_ARADO).updated_at;

        send('PATCH', `/library/${TORTO_ARADO}/position`, {
            before_book_id: null,
        });

        expect(requireBook(TORTO_ARADO).updated_at).toBe(before);
    });

    it('ignores a move to a book that does not exist', () => {
        send('PATCH', `/library/${TORTO_ARADO}/position`, {
            before_book_id: 999,
        });

        expect(requireBook(TORTO_ARADO).shelf_position).toBeNull();
    });
});

describe('book posture', () => {
    it('lays a book down and stands it up again', () => {
        send('PATCH', `/library/${MEMORIAS}/posture`, { is_lying_down: true });
        expect(requireBook(MEMORIAS).is_lying_down).toBe(1);

        send('PATCH', `/library/${MEMORIAS}/posture`, { is_lying_down: false });
        expect(requireBook(MEMORIAS).is_lying_down).toBe(0);
    });

    it('keeps the cover version when a book is laid down', () => {
        const before = requireBook(MEMORIAS).updated_at;

        send('PATCH', `/library/${MEMORIAS}/posture`, { is_lying_down: true });

        expect(requireBook(MEMORIAS).updated_at).toBe(before);
    });

    it('ignores a value that is not a boolean', () => {
        send('PATCH', `/library/${MEMORIAS}/posture`, {
            is_lying_down: 'maybe',
        });

        expect(requireBook(MEMORIAS).is_lying_down).toBe(0);
    });
});

describe('library listing of the bookcase', () => {
    it('sends each book the shelf it sits on, and the shelves in order', () => {
        send('PATCH', `/library/${REFACTORING}/position`, {
            before_book_id: null,
            bookshelf_id: TECNOLOGIA_SHELF,
        });

        const response = send('GET', '/library');
        const rows = libraryRowsOf(response);

        expect(
            rows.find((row) => row.title === 'Refactoring')?.bookshelf_id,
        ).toBe(TECNOLOGIA_SHELF);
        expect(
            rows.find((row) => row.title === 'Torto Arado')?.bookshelf_id,
        ).toBe(CATCH_ALL_SHELF);
        expect(response.page?.props.bookcase).toEqual([
            { id: FICCAO_SHELF, name: 'Ficção', is_catch_all: false },
            { id: TECNOLOGIA_SHELF, name: 'Tecnologia', is_catch_all: false },
            { id: FANTASIA_SHELF, name: 'Fantasia', is_catch_all: false },
            { id: CATCH_ALL_SHELF, name: 'Outros', is_catch_all: true },
        ]);
    });
});
