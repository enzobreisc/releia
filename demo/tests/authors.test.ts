import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { loadAuthorWorks } from '../src/external/author-works';
import type { AuthorRow, BookRow, DemoStateFile } from '../src/state/types';

const REQUEST_TIMEOUT_MS = 8000;
const BRAZILIAN_ISBN = '9788535902778';
const MACHADO_ID = 4;
const ITAMAR_ID = 1;
const MACHADO_BOOK_IDS = [4, 10];

const exportFile = JSON.parse(
    readFileSync(new URL('../data/state.json', import.meta.url), 'utf8'),
) as DemoStateFile;

function authorById(id: number): AuthorRow {
    const author = exportFile.tables.authors.find((row) => row.id === id);

    if (author === undefined) {
        throw new Error(`Author ${id} is not in the export.`);
    }

    return { ...author, open_library_key: `OL${id}A` };
}

function booksById(ids: readonly number[]): BookRow[] {
    return exportFile.tables.books.filter((book) => ids.includes(book.id));
}

function openLibraryDocs(docs: unknown[]): Response {
    return new Response(JSON.stringify({ docs }), {
        headers: { 'content-type': 'application/json' },
    });
}

const MACHADO_WORKS = [
    {
        key: '/works/OL100W',
        title: 'Quincas Borba',
        author_name: ['Machado de Assis'],
        isbn: [BRAZILIAN_ISBN],
        language: ['por'],
        first_publish_year: 1891,
        cover_i: 77,
        edition_count: 4,
    },
    {
        key: '/works/OL101W',
        title: 'Dom Casmurro',
        author_name: ['Machado de Assis'],
        isbn: [BRAZILIAN_ISBN],
        language: ['por'],
        first_publish_year: 1899,
        cover_i: 78,
        edition_count: 9,
    },
    {
        key: '/works/OL102W',
        title: 'The Posthumous Memoirs',
        author_name: ['Machado de Assis'],
        isbn: [BRAZILIAN_ISBN],
        language: ['eng'],
        first_publish_year: 1881,
        cover_i: null,
        edition_count: 2,
    },
];

function stubOpenLibraryWorks(): void {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (input: URL) => {
            const url = input;

            return openLibraryDocs(
                url.pathname === '/search.json' &&
                    url.searchParams.get('language') === 'por'
                    ? MACHADO_WORKS
                    : [],
            );
        }),
    );
}

/** A request that never answers, so only the abort ends it. */
function stubUnansweredFetch(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () =>
                    reject(new DOMException('aborted', 'AbortError')),
                );
            }),
    );

    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('author works from Open Library', () => {
    it('lists the Portuguese works the library lacks, with a Brazilian edition', async () => {
        stubOpenLibraryWorks();

        const works = await loadAuthorWorks(
            authorById(MACHADO_ID),
            booksById(MACHADO_BOOK_IDS),
            booksById(MACHADO_BOOK_IDS),
        );

        expect(works).toEqual({
            verified: true,
            owns_all: false,
            items: [
                {
                    title: 'Quincas Borba',
                    year: 1891,
                    cover_url: 'https://covers.openlibrary.org/b/id/77-L.jpg',
                    work_key: 'OL100W',
                    edition_count: 4,
                    portuguese: true,
                    isbn_13: BRAZILIAN_ISBN,
                },
            ],
        });
    });

    it('marks the author as owned in full when every Portuguese work is on the shelf', async () => {
        stubOpenLibraryWorks();
        const ownedQuincas: BookRow = {
            ...booksById([4])[0]!,
            id: 99,
            title: 'Quincas Borba',
        };

        const works = await loadAuthorWorks(
            authorById(MACHADO_ID),
            booksById(MACHADO_BOOK_IDS),
            [...booksById([4]), ownedQuincas],
        );

        expect(works).toEqual({ verified: true, owns_all: true, items: [] });
    });

    it('falls back to the canned works of a demo author when Open Library times out', async () => {
        vi.useFakeTimers();
        const fetchMock = stubUnansweredFetch();

        const pending = loadAuthorWorks(
            authorById(MACHADO_ID),
            booksById(MACHADO_BOOK_IDS),
            booksById(MACHADO_BOOK_IDS),
        );
        await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);

        const [, init] = fetchMock.mock.calls[0] as [unknown, RequestInit];
        expect(init.signal?.aborted).toBe(false);

        await vi.advanceTimersByTimeAsync(1);
        const works = await pending;

        expect(init.signal?.aborted).toBe(true);
        expect(works.verified).toBe(true);
        expect(works.items.map((item) => item.title)).toEqual([
            'Quincas Borba',
            'Esaú e Jacó',
            'Memorial de Aires',
        ]);
    });

    it('reports the author as unverified when Open Library times out and no canned works exist', async () => {
        vi.useFakeTimers();
        stubUnansweredFetch();

        const pending = loadAuthorWorks(
            { ...authorById(ITAMAR_ID), open_library_key: 'OL9999A' },
            booksById([1]),
            booksById([1]),
        );
        await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

        expect(await pending).toEqual({
            verified: false,
            owns_all: false,
            items: [],
        });
    });
});
