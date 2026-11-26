import { toIsbn13 } from '../support/isbn';
import { isHttpUrl } from '../support/http-url';
import type { BookSource, DemoState, ReadingStatus } from '../state/types';
import type { NewBook } from './library-writes';

type NewBookInput =
    | { ok: true; book: NewBook }
    | { ok: false; message: string };

type Body = Record<string, unknown>;

class InvalidInput extends Error {}

export const READING_STATUSES: readonly ReadingStatus[] = [
    'want_to_read',
    'reading',
    'read',
    'abandoned',
];
const BOOK_SOURCES: readonly BookSource[] = [
    'open_library',
    'google_books',
    'brasil_api',
    'manual',
];
const DEFAULT_SOURCE: BookSource = 'manual';
const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const WHOLE_NUMBER = /^-?\d+$/;
const TRUE_FLAGS: readonly unknown[] = [true, 1, '1', 'true'];
const PAGES_RANGE = { min: 1, max: 20_000 };
const YEAR_RANGE = { min: 1000, max: 2100 };
const SERIES_POSITION_RANGE = { min: 1, max: 999 };

function invalid(message: string): never {
    throw new InvalidInput(message);
}

/** Trimmed text, or null for an absent or blank value (Laravel turns blanks into null). */
function textOf(value: unknown): string | null {
    if (typeof value === 'number') {
        return String(value);
    }

    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    return value.trim();
}

function wholeNumberOf(
    body: Body,
    key: string,
    range: { min: number; max: number },
    message: string,
): number | null {
    const text = textOf(body[key]);

    if (text === null) {
        return null;
    }

    const number = Number(text);

    if (!WHOLE_NUMBER.test(text) || number < range.min || number > range.max) {
        invalid(message);
    }

    return number;
}

function isbnOf(body: Body, state: DemoState): string | null {
    const raw = textOf(body.isbn_13);

    if (raw === null) {
        return null;
    }

    const isbn13 = toIsbn13(raw);

    if (isbn13 === null) {
        invalid('ISBN inválido.');
    }

    if (state.tables.books.some((book) => book.isbn_13 === isbn13)) {
        invalid('Esse livro já está na biblioteca.');
    }

    return isbn13;
}

function dayOf(value: unknown): string | null {
    const day = textOf(value);

    if (day === null) {
        return null;
    }

    if (!DAY_FORMAT.test(day) || Number.isNaN(Date.parse(day))) {
        invalid('Data do término inválida.');
    }

    return day;
}

function statusOf(value: unknown): ReadingStatus {
    const status = READING_STATUSES.find(
        (candidate) => candidate === textOf(value),
    );

    return status ?? invalid('Status inválido.');
}

function sourceOf(value: unknown): BookSource {
    const source = textOf(value);

    return (
        BOOK_SOURCES.find((candidate) => candidate === source) ?? DEFAULT_SOURCE
    );
}

function coverUrlOf(value: unknown): string | null {
    const url = textOf(value);

    if (url !== null && !isHttpUrl(url)) {
        invalid('Endereço da capa inválido.');
    }

    return url;
}

function authorsOf(value: unknown): string[] {
    const names =
        typeof value === 'string'
            ? value.split(',')
            : Array.isArray(value)
              ? value
              : [];

    return names.flatMap((name) => textOf(name) ?? []);
}

function parseNewBook(body: Body, state: DemoState, today: string): NewBook {
    const title = textOf(body.title) ?? invalid('Informe o título.');
    const isbn13 = isbnOf(body, state);
    const pages = wholeNumberOf(
        body,
        'pages',
        PAGES_RANGE,
        'Número de páginas inválido.',
    );
    const publishedYear = wholeNumberOf(
        body,
        'published_year',
        YEAR_RANGE,
        'Ano inválido.',
    );
    const seriesPosition = wholeNumberOf(
        body,
        'series_position',
        SERIES_POSITION_RANGE,
        'Volume inválido.',
    );
    const finishedOn = dayOf(body.finished_on);

    if (finishedOn !== null && finishedOn > today) {
        invalid('O término não pode ser depois de hoje.');
    }

    return {
        title,
        subtitle: textOf(body.subtitle),
        authors: authorsOf(body.authors),
        isbn13,
        publisher: textOf(body.publisher),
        publishedYear,
        pages,
        genre: textOf(body.genre),
        series: textOf(body.series),
        seriesPosition,
        description: textOf(body.description),
        coverUrl: coverUrlOf(body.cover_url),
        source: sourceOf(body.source),
        status: statusOf(body.status),
        finishedOn,
        undated: TRUE_FLAGS.includes(body.undated),
    };
}

/** StoreBookRequest: the form's fields as a new book. The first failing rule is reported. */
export function newBookInput(
    body: Body,
    state: DemoState,
    today: string,
): NewBookInput {
    try {
        return { ok: true, book: parseNewBook(body, state, today) };
    } catch (error) {
        if (error instanceof InvalidInput) {
            return { ok: false, message: error.message };
        }

        throw error;
    }
}
