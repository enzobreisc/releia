import { afterAll, beforeEach, describe, expect, it } from 'vite-plus/test';
import en from '../../lang/en.json';
import { getState } from '../src/state/store';
import type { HttpMethod } from '../src/server/router';
import {
    resetDemoState,
    restoreClock,
    sendRequest,
    type ServedResponse,
} from './harness';

const TAKEN_ISBN = '9786580309313';
const READING_BOOK = 9;
const READING_ID = 9;
const READ_BOOK = 2;
const READ_READING = 2;
const READ_SESSION = 26;
const SESSION_PAGE_FROM = 436;
const PINNED_BOOKS_TO_FILL = [2, 3, 4];
const BOOK_WITHOUT_PIN = 7;
const LAST_PAGE_BEFORE_FINISH = 90;
const BOOK_PAGES = 448;
const FAR_FUTURE = '2099-01-01';
const NEXT_YEAR = 2027;

type Fields = Record<string, string>;

afterAll(() => {
    restoreClock();
});

beforeEach(() => {
    resetDemoState({ locale: 'pt-BR' });
});

function send(
    method: HttpMethod,
    url: string,
    body: Record<string, unknown>,
    currentPath: string,
): ServedResponse {
    return sendRequest({ method, url, body, currentPath });
}

/** Laravel sends the errors as an empty list when there is nothing to show, else as a map of field to message. */
function errorsOf(response: ServedResponse): unknown {
    return response.page?.props.errors;
}

function expectFieldErrors(response: ServedResponse, expected: Fields): void {
    expect(errorsOf(response)).toEqual(expected);
}

function expectNoErrors(response: ServedResponse): void {
    expect(errorsOf(response)).toEqual([]);
}

function pageOf(response: ServedResponse): string | undefined {
    return response.page?.component;
}

function highestSessionOf(readingId: number): { id: number; pageTo: number } {
    const sessions = getState().tables.reading_sessions.filter(
        (session) => session.reading_id === readingId,
    );
    const highest = sessions.reduce((best, session) =>
        session.page_to > best.page_to ? session : best,
    );

    return { id: highest.id, pageTo: highest.page_to };
}

describe('add book (POST /library)', () => {
    const ADD_PAGE = '/library/add';

    it('keeps the form and shows the title error next to the field', () => {
        const response = send(
            'POST',
            '/library',
            { title: '', status: 'reading' },
            ADD_PAGE,
        );

        expect(pageOf(response)).toBe('add-book');
        expectFieldErrors(response, { title: 'Informe o título.' });
    });

    it('refuses an ISBN that is not valid', () => {
        const response = send(
            'POST',
            '/library',
            { title: 'Livro', status: 'reading', isbn_13: '123' },
            ADD_PAGE,
        );

        expectFieldErrors(response, { isbn_13: 'ISBN inválido.' });
    });

    it('refuses an ISBN that is already in the library', () => {
        const book = getState().tables.books.find((row) => row.id === 1);
        if (book === undefined) throw new Error('fixture book 1 is missing');
        book.isbn_13 = TAKEN_ISBN;

        const response = send(
            'POST',
            '/library',
            {
                title: 'Outro',
                status: 'reading',
                isbn_13: TAKEN_ISBN,
            },
            ADD_PAGE,
        );

        expectFieldErrors(response, {
            isbn_13: 'Esse livro já está na biblioteca.',
        });
    });

    it('refuses pages, year, volume and a finish date out of range', () => {
        const response = send(
            'POST',
            '/library',
            {
                title: 'Livro',
                status: 'read',
                pages: '0',
                published_year: '999',
                series_position: '0',
                finished_on: FAR_FUTURE,
            },
            ADD_PAGE,
        );

        expectFieldErrors(response, {
            pages: 'Número de páginas inválido.',
            published_year: 'Ano inválido.',
            series_position: 'Volume inválido.',
            finished_on: 'O término não pode ser depois de hoje.',
        });
    });

    it('answers with the English text in English', () => {
        resetDemoState({ locale: 'en' });

        const response = send(
            'POST',
            '/library',
            { title: '', status: 'reading' },
            ADD_PAGE,
        );

        expectFieldErrors(response, {
            title: en['Informe o título.'],
        });
    });

    it('redirects to the new book without errors when the form is valid', () => {
        const response = send(
            'POST',
            '/library',
            { title: 'Livro novo', status: 'want_to_read' },
            ADD_PAGE,
        );

        expect(pageOf(response)).toBe('book');
        expectNoErrors(response);
    });
});

describe('book edit (PATCH /library/{book})', () => {
    const BOOK_PAGE = `/library/${READ_BOOK}`;

    it('refuses an empty title', () => {
        const response = send(
            'PATCH',
            `/library/${READ_BOOK}`,
            { title: '' },
            BOOK_PAGE,
        );

        expectFieldErrors(response, { title: 'Informe o título.' });
    });

    it('keeps the page total from falling below a logged session', () => {
        const highest = highestSessionOf(READ_READING);
        const response = send(
            'PATCH',
            `/library/${READ_BOOK}`,
            { title: 'Sapiens', pages: '400' },
            BOOK_PAGE,
        );

        expect(errorsOf(response)).toEqual({
            pages: expect.stringMatching(
                new RegExp(
                    `^O livro não pode ter menos que ${highest.pageTo} páginas: a sessão [0-9a-f]{7} de .+ vai até a p\\. ${highest.pageTo}\\.$`,
                ),
            ),
            pages_session: String(highest.id),
        });
    });

    it('refuses an ISBN that belongs to another book and points at it', () => {
        const other = getState().tables.books.find((row) => row.id === 1);
        if (other === undefined) throw new Error('fixture book 1 is missing');
        other.isbn_13 = TAKEN_ISBN;

        const response = send(
            'PATCH',
            `/library/${READ_BOOK}`,
            { title: 'Sapiens', isbn_13: TAKEN_ISBN },
            BOOK_PAGE,
        );

        expect(errorsOf(response)).toEqual({
            isbn_13: expect.stringMatching(
                /^Esse ISBN já é de outro livro da biblioteca: Torto Arado/,
            ),
            isbn_13_book: '1',
        });
    });

    it('refuses a publication year that is too early or too late', () => {
        const response = send(
            'PATCH',
            `/library/${READ_BOOK}`,
            { title: 'Sapiens', published_year: '1449' },
            BOOK_PAGE,
        );

        expectFieldErrors(response, {
            published_year: `Use um ano entre 1450 e ${NEXT_YEAR}.`,
        });
    });
});

describe('finish reading (POST /readings/{reading}/finish)', () => {
    const FINISH_PAGE = `/library/${READING_BOOK}`;
    const finishUrl = `/readings/${READING_ID}/finish`;

    it('asks for the finish date unless the book is undated', () => {
        const response = send('POST', finishUrl, {}, FINISH_PAGE);

        expectFieldErrors(response, {
            finished_on:
                'O campo término é obrigatório quando undated não está presente.',
        });
    });

    it('refuses a finish date in the future', () => {
        const response = send(
            'POST',
            finishUrl,
            { finished_on: FAR_FUTURE },
            FINISH_PAGE,
        );

        expectFieldErrors(response, {
            finished_on: 'O término não pode ser depois de hoje.',
        });
    });

    it('refuses a finish date before the reading started', () => {
        const response = send(
            'POST',
            finishUrl,
            { finished_on: '2026-10-01' },
            FINISH_PAGE,
        );

        expect(errorsOf(response)).toEqual({
            finished_on: expect.stringMatching(/^A leitura começou em/),
        });
    });
});

describe('dates of a reading (PATCH /readings/{reading}/dates)', () => {
    const DATES_URL = `/readings/${READ_READING}/dates`;
    const DATES_PAGE = `/library/${READ_BOOK}`;

    it('refuses a finish date before the start date', () => {
        const response = send(
            'PATCH',
            DATES_URL,
            { started_at: '2026-03-16', finished_at: '2026-03-15' },
            DATES_PAGE,
        );

        expectFieldErrors(response, {
            finished_at: 'O término não pode ser antes do início.',
        });
    });

    it('asks for the start date of a finished reading', () => {
        const response = send(
            'PATCH',
            DATES_URL,
            { finished_at: '2026-04-14' },
            DATES_PAGE,
        );

        expectFieldErrors(response, { started_at: 'Informe o início.' });
    });
});

describe('reading sessions (POST /library/{book}/sessions, PATCH /sessions/{session})', () => {
    const SESSIONS_PAGE = `/library/${READING_BOOK}`;

    it('asks for the current page when logging a session', () => {
        const response = send(
            'POST',
            `/library/${READING_BOOK}/sessions`,
            {},
            SESSIONS_PAGE,
        );

        expectFieldErrors(response, { page_to: 'Informe a página atual.' });
    });

    it('refuses a page that is not a number', () => {
        const response = send(
            'POST',
            `/library/${READING_BOOK}/sessions`,
            { page_to: 'abc' },
            SESSIONS_PAGE,
        );

        expectFieldErrors(response, {
            page_to: 'Número de página inválido.',
        });
    });

    it('refuses a page that is not after the current one', () => {
        const response = send(
            'POST',
            `/library/${READING_BOOK}/sessions`,
            { page_to: LAST_PAGE_BEFORE_FINISH },
            SESSIONS_PAGE,
        );

        expectFieldErrors(response, {
            page_to: `Informe uma página depois da pág. ${LAST_PAGE_BEFORE_FINISH}.`,
        });
    });

    it('refuses minutes outside 1 to 1440', () => {
        const response = send(
            'POST',
            `/library/${READING_BOOK}/sessions`,
            { page_to: 100, minutes: 0 },
            SESSIONS_PAGE,
        );

        expectFieldErrors(response, {
            minutes: 'Informe entre 1 e 1440 minutos.',
        });
    });

    it('asks for the date and a page when correcting a session', () => {
        const response = send(
            'PATCH',
            `/sessions/${READ_SESSION}`,
            { read_on: '', page_to: '' },
            `/library/${READ_BOOK}`,
        );

        expectFieldErrors(response, {
            read_on: 'Informe a data.',
            page_to: 'Informe a página.',
        });
    });

    it('refuses a corrected end page before the session starts', () => {
        const response = send(
            'PATCH',
            `/sessions/${READ_SESSION}`,
            { read_on: '2026-04-14', page_to: '400', minutes: '' },
            `/library/${READ_BOOK}`,
        );

        expectFieldErrors(response, {
            page_to: `Use uma página a partir da ${SESSION_PAGE_FROM}.`,
        });
    });
});

describe('notes (POST /notes, PATCH /notes/{note})', () => {
    const NOTE_PAGE = '/library/1';

    it('refuses an empty note text', () => {
        const response = send(
            'POST',
            '/notes',
            { book_id: 1, kind: 'excerpt', body_md: '' },
            NOTE_PAGE,
        );

        expectFieldErrors(response, {
            body_md: 'Escreva o texto da nota.',
        });
    });

    it('refuses a kind that is not one of the note kinds', () => {
        const response = send(
            'POST',
            '/notes',
            { book_id: 1, kind: 'nope', body_md: 'Texto' },
            NOTE_PAGE,
        );

        expectFieldErrors(response, {
            kind: 'O valor escolhido para tipo é inválido.',
        });
    });

    it('asks for the book and refuses one that does not exist', () => {
        const missing = send(
            'POST',
            '/notes',
            { kind: 'excerpt', body_md: 'Texto' },
            NOTE_PAGE,
        );
        const unknown = send(
            'POST',
            '/notes',
            { book_id: 9999, kind: 'excerpt', body_md: 'Texto' },
            NOTE_PAGE,
        );

        expectFieldErrors(missing, { book_id: 'Escolha o livro.' });
        expectFieldErrors(unknown, { book_id: 'Livro não encontrado.' });
    });

    it('refuses a page of zero', () => {
        const response = send(
            'POST',
            '/notes',
            { book_id: 1, kind: 'excerpt', body_md: 'Texto', page: '0' },
            NOTE_PAGE,
        );

        expectFieldErrors(response, {
            page: 'Número de página inválido.',
        });
    });
});

describe('reading goal (PUT /goal)', () => {
    const HOME = '/';

    it('refuses a yearly goal outside 1 to 999', () => {
        const response = send('PUT', '/goal', { yearly_goal: 0 }, HOME);

        expectFieldErrors(response, {
            yearly_goal: 'A meta vai de 1 a 999 livros.',
        });
    });

    it('refuses a daily goal of zero and keeps the yearly one', () => {
        const response = send(
            'PUT',
            '/goal',
            { yearly_goal: 30, daily_goal: 0 },
            HOME,
        );

        expectFieldErrors(response, {
            daily_goal: 'A meta diária vai de 1 a 2000 páginas.',
        });
    });

    it('asks for the yearly goal when it is blank', () => {
        const response = send('PUT', '/goal', { yearly_goal: '' }, HOME);

        expectFieldErrors(response, {
            yearly_goal: 'O campo meta é obrigatório.',
        });
    });
});

describe('reader profile (PUT /profile)', () => {
    const PROFILE = '/profile';

    it('refuses a name longer than 60 characters', () => {
        const response = send(
            'PUT',
            '/profile',
            { name: 'a'.repeat(61), bio: '' },
            PROFILE,
        );

        expectFieldErrors(response, {
            name: 'O campo nome deve ter no máximo 60 caracteres.',
        });
    });

    it('refuses a bio longer than 160 characters', () => {
        const response = send(
            'PUT',
            '/profile',
            { name: 'Ana', bio: 'b'.repeat(161) },
            PROFILE,
        );

        expectFieldErrors(response, {
            bio: 'O campo sobre você deve ter no máximo 160 caracteres.',
        });
    });
});

describe('pinned books (POST /profile/pins)', () => {
    it('refuses a pin beyond the limit beside the pins', () => {
        for (const bookId of PINNED_BOOKS_TO_FILL) {
            send('POST', '/profile/pins', { book_id: bookId }, '/profile');
        }

        const response = send(
            'POST',
            '/profile/pins',
            { book_id: BOOK_WITHOUT_PIN },
            '/profile',
        );

        expectFieldErrors(response, {
            book_id: 'Você pode fixar até 6 livros.',
        });
    });
});

describe('shopping list (POST /shopping, PATCH /shopping/{item})', () => {
    const SHOPPING = '/shopping';

    it('asks for the title of a new item', () => {
        const response = send(
            'POST',
            '/shopping',
            { title: '', store_type: 'online' },
            SHOPPING,
        );

        expectFieldErrors(response, {
            title: 'O campo título é obrigatório.',
        });
    });

    it('refuses a price that is not in the reais format', () => {
        const response = send(
            'POST',
            '/shopping',
            { title: 'X', store_type: 'bookstore', estimated_price: '12,345' },
            SHOPPING,
        );

        expectFieldErrors(response, {
            estimated_price: 'Preço inválido. Use o formato 34,90.',
        });
    });

    it('refuses an ISBN that is not valid', () => {
        const response = send(
            'POST',
            '/shopping',
            { title: 'X', store_type: 'bookstore', isbn: '123' },
            SHOPPING,
        );

        expectFieldErrors(response, { isbn: 'ISBN inválido.' });
    });

    it('refuses a link that is not http or https', () => {
        const response = send(
            'POST',
            '/shopping',
            {
                title: 'X',
                store_type: 'online',
                url: 'javascript:alert(1)',
            },
            SHOPPING,
        );

        expectFieldErrors(response, {
            url: 'O campo link deve ser um link válido.',
        });
    });

    it('refuses an unknown store type', () => {
        const response = send(
            'POST',
            '/shopping',
            { title: 'X', store_type: 'nope' },
            SHOPPING,
        );

        expectFieldErrors(response, {
            store_type: 'O valor escolhido para loja é inválido.',
        });
    });

    it('refuses a new price that is not in the reais format', () => {
        const response = send(
            'PATCH',
            '/shopping/1',
            { estimated_price: '2,345' },
            SHOPPING,
        );

        expectFieldErrors(response, {
            estimated_price: 'Preço inválido. Use o formato 34,90.',
        });
    });
});

describe('quick log (POST /quick-log, timer)', () => {
    const QUICK_LOG = '/quick-log';

    it('refuses a book that does not exist', () => {
        const response = send(
            'POST',
            '/quick-log',
            { book_id: 9999, page_to: 40 },
            QUICK_LOG,
        );

        expectFieldErrors(response, {
            book_id: 'O valor escolhido para livro é inválido.',
        });
    });

    it('refuses a page that is not after the current one', () => {
        const response = send(
            'POST',
            '/quick-log',
            { book_id: READING_BOOK, page_to: 40 },
            QUICK_LOG,
        );

        expectFieldErrors(response, {
            page_to: `Informe uma página depois da pág. ${LAST_PAGE_BEFORE_FINISH}.`,
        });
    });

    it('refuses a timer that starts before the logged page', () => {
        const response = send(
            'POST',
            '/quick-log/timer',
            { book_id: READING_BOOK, start_page: 20 },
            QUICK_LOG,
        );

        expectFieldErrors(response, {
            start_page: `Você já registrou até a pág. ${LAST_PAGE_BEFORE_FINISH}.`,
        });
    });

    it('refuses a timer that starts on the last page of the book', () => {
        const response = send(
            'POST',
            '/quick-log/timer',
            { book_id: READING_BOOK, start_page: BOOK_PAGES },
            QUICK_LOG,
        );

        expectFieldErrors(response, {
            start_page: `O livro tem ${BOOK_PAGES} páginas.`,
        });
    });

    it('refuses to finish a timer on the page it started', () => {
        send(
            'POST',
            '/quick-log/timer',
            { book_id: READING_BOOK, start_page: LAST_PAGE_BEFORE_FINISH },
            QUICK_LOG,
        );

        const response = send(
            'POST',
            '/quick-log/timer/finish',
            { page_to: String(LAST_PAGE_BEFORE_FINISH) },
            QUICK_LOG,
        );

        expectFieldErrors(response, {
            page_to: `Informe uma página depois da pág. ${LAST_PAGE_BEFORE_FINISH}.`,
        });
    });
});

describe('live session (POST /live-session/finish)', () => {
    it('refuses to finish without moving past the starting page', () => {
        send('POST', `/library/${READING_BOOK}/live-session`, {}, '/library');

        const response = send(
            'POST',
            '/live-session/finish',
            {},
            '/live-session',
        );

        expectFieldErrors(response, {
            page_to: `Informe uma página depois da pág. ${LAST_PAGE_BEFORE_FINISH}.`,
        });
    });
});

describe('field errors are delivered once', () => {
    it('shows the errors on the page the redirect lands on, then clears them', () => {
        const failed = send('PUT', '/goal', { yearly_goal: 0 }, '/');
        const next = send('GET', '/library/add', {}, '/library/add');

        expect(errorsOf(failed)).not.toEqual([]);
        expectNoErrors(next);
    });
});
