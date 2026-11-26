import { readFileSync } from 'node:fs';
import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {
    clearLookupCache,
    findBookByIsbn,
    searchBooks,
} from '../src/external/book-search';
import { dispatchAsync } from '../src/server/dispatch';
import { getState } from '../src/state/store';
import {
    type ScenarioStep,
    formatMismatch,
    restoreClock,
    resetDemoState,
    runScenario,
    sendRequest,
} from './harness';

const SCENARIOS_FILE = new URL('../golden/scenarios.json', import.meta.url);
const ADD_BOOK_SCENARIO = 'add-book';
const TORTO_ARADO_ISBN = '9788535933314';
const MANUAL_ISBN = '9780000000002';
const SHORT_TIMEOUT_MS = 5;

type StubbedFetch = (url: string, init: RequestInit) => Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

/** Answers each request by its URL; a URL with no answer fails as a network error. */
function stubFetch(answers: Record<string, unknown>): void {
    const stub: StubbedFetch = async (url) => {
        const match = Object.keys(answers).find((part) => url.includes(part));

        if (match === undefined) {
            throw new TypeError('network down');
        }

        return jsonResponse(answers[match]);
    };

    vi.stubGlobal('fetch', stub);
}

/** A request that only ends when the client aborts it, as a slow server would. */
function stubHangingFetch(): void {
    const stub = (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
                reject(new DOMException('aborted', 'AbortError')),
            );
        });

    vi.stubGlobal('fetch', stub);
}

function scenarioSteps(): ScenarioStep[] {
    const scenarios = JSON.parse(
        readFileSync(SCENARIOS_FILE, 'utf8'),
    ) as Record<
        string,
        {
            step: string;
            method: ScenarioStep['method'];
            url: string;
            body?: Record<string, unknown>;
            golden: string;
        }[]
    >;

    return scenarios[ADD_BOOK_SCENARIO].map((step) => ({
        method: step.method,
        url: step.url,
        body: step.body,
        golden: `scenarios/${ADD_BOOK_SCENARIO}/${step.step}-${step.golden}`,
    }));
}

const OPEN_LIBRARY_DOC = {
    key: '/works/OL123W',
    title: 'Torto Arado',
    author_name: ['Itamar Vieira Junior', 'Itamar Vieira Júnior'],
    first_publish_year: 2019,
    isbn: ['9780000000002', TORTO_ARADO_ISBN],
    cover_i: 42,
    subject: ['Brazilian fiction', 'Romance'],
    edition_count: 3,
};

beforeEach(() => {
    clearLookupCache();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

afterAll(() => {
    restoreClock();
});

describe('add-book scenario', () => {
    it.each(['pt-BR', 'en'] as const)(
        'matches the golden pages of the scenario in %s',
        (locale) => {
            const results = runScenario({ locale, steps: scenarioSteps() });
            const mismatches = results.flatMap((result) =>
                (result.comparison?.mismatches ?? []).map(formatMismatch),
            );

            expect(results.map((result) => result.response.status)).toEqual([
                200, 200, 200,
            ]);
            expect(mismatches).toEqual([]);
        },
    );
});

describe('adding a book', () => {
    it('stores the book, its authors and the reading the form describes', () => {
        const [, addWantToRead, addAlreadyRead] = scenarioSteps();
        runScenario({ steps: [addWantToRead, addAlreadyRead] });

        const { tables } = getState();
        const book = tables.books.find((row) => row.id === 16);
        const reading = tables.readings.find((row) => row.book_id === 16);
        const authorIds = tables.author_book
            .filter((link) => link.book_id === 16)
            .map((link) => link.author_id);

        expect(book).toMatchObject({
            title: 'Livro Demo Lido',
            pages: 150,
            published_year: 2018,
            cover_path: null,
            search_text: 'livro demo lido autora exemplo',
        });
        expect(reading).toMatchObject({
            status: 'read',
            started_at: '2026-11-20 00:00:00',
            finished_at: '2026-11-20 00:00:00',
            current_page: 150,
        });
        expect(authorIds).toEqual([14]);
        expect(tables.queue_items.map((item) => item.book_id)).not.toContain(
            16,
        );
    });

    it('rejects an ISBN that the library already has', () => {
        resetDemoState({ locale: 'pt-BR' });
        const isbn13 = MANUAL_ISBN;
        sendRequest({
            method: 'POST',
            url: '/library',
            body: {
                title: 'Primeiro',
                isbn_13: isbn13,
                status: 'want_to_read',
            },
        });

        const response = sendRequest({
            method: 'POST',
            url: '/library',
            body: {
                title: 'Repetido',
                isbn_13: isbn13,
                status: 'want_to_read',
            },
        });

        expect(response.page?.props.toast).toMatchObject({
            kind: 'error',
            title: 'Esse livro já está na biblioteca.',
        });
        restoreClock();
    });
});

describe('searchBooks', () => {
    it('maps Open Library search documents to candidates', async () => {
        stubFetch({ 'search.json': { docs: [OPEN_LIBRARY_DOC] } });

        const [book] = await searchBooks('Torto Arado', null);

        expect(book).toMatchObject({
            title: 'Torto Arado',
            source: 'open_library',
            isbn13: TORTO_ARADO_ISBN,
            isbn10: '853593331X',
            authors: ['Itamar Vieira Junior'],
            publishedYear: 2019,
            genre: 'Romance',
            coverUrl: 'https://covers.openlibrary.org/b/id/42-L.jpg',
            workKey: 'OL123W',
            editionCount: 3,
        });
    });

    it('gives up after the timeout and returns no results', async () => {
        stubHangingFetch();

        const results = await searchBooks('Duna', null, {
            timeoutMs: SHORT_TIMEOUT_MS,
        });

        expect(results).toEqual([]);
    });

    it('retries without the publisher when the publisher filter finds nothing', async () => {
        const requested: string[] = [];
        vi.stubGlobal('fetch', async (url: string) => {
            requested.push(url);

            return jsonResponse({
                docs: url.includes('publisher=') ? [] : [OPEN_LIBRARY_DOC],
            });
        });

        const results = await searchBooks('Torto Arado', 'Todavia');

        expect(requested).toHaveLength(2);
        expect(requested[0]).toContain('publisher=todavia');
        expect(requested[1]).not.toContain('publisher=');
        expect(results).toHaveLength(1);
    });

    it('answers the add-book page search through the async dispatch', async () => {
        stubFetch({ 'search.json': { docs: [OPEN_LIBRARY_DOC] } });
        resetDemoState({ locale: 'pt-BR' });

        const response = await dispatchAsync({
            method: 'GET',
            url: '/library/add?q=Torto%20Arado',
            body: {},
            headers: { 'x-inertia': 'true' },
            currentPath: '/library/add?q=Torto%20Arado',
        });
        const page = JSON.parse(response.body) as {
            props: { results: { title: string; library_id: number | null }[] };
        };

        expect(response.status).toBe(200);
        expect(page.props.results[0]).toMatchObject({
            title: 'Torto Arado',
            library_id: null,
        });
        restoreClock();
    });
});

describe('findBookByIsbn', () => {
    it('completes an Open Library record with its work and BrasilAPI', async () => {
        stubFetch({
            'api/books': {
                [`ISBN:${TORTO_ARADO_ISBN}`]: {
                    title: 'Livro Sem Dados',
                    authors: [{ name: 'Autora Exemplo' }],
                    publishers: [{ name: 'Editora Demo' }],
                    publish_date: 'March 2019',
                },
            },
            'search.json': {
                docs: [{ number_of_pages_median: 210, subject: ['Ensaios'] }],
            },
            'brasilapi.com.br': { title: 'Livro Sem Dados', page_count: 300 },
        });

        const book = await findBookByIsbn(TORTO_ARADO_ISBN);

        expect(book).toMatchObject({
            title: 'Livro Sem Dados',
            isbn13: TORTO_ARADO_ISBN,
            authors: ['Autora Exemplo'],
            publisher: 'Editora Demo',
            publishedYear: 2019,
            pages: 210,
            genre: 'Crônicas',
        });
    });

    it('asks BrasilAPI only for Brazilian ISBNs', async () => {
        const requested: string[] = [];
        vi.stubGlobal('fetch', async (url: string) => {
            requested.push(url);

            return jsonResponse({});
        });

        await findBookByIsbn(MANUAL_ISBN);

        expect(requested.some((url) => url.includes('brasilapi'))).toBe(false);
    });

    it('returns null when no source knows the ISBN', async () => {
        stubFetch({});

        expect(await findBookByIsbn(MANUAL_ISBN)).toBeNull();
    });
});
