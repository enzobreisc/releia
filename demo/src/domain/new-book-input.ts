import { toIsbn13 } from '../support/isbn';
import { isHttpUrl } from '../support/http-url';
import {
    FormErrors,
    checkDayFormat,
    checkMaxLength,
    isDayText,
    wholeNumberField,
} from '../support/form-errors';
import type { BookSource, DemoState, ReadingStatus } from '../state/types';
import type { NewBook } from './library-writes';

type Body = Record<string, unknown>;

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
const TRUE_FLAGS: readonly unknown[] = [true, 1, '1', 'true'];
const PAGES_RANGE = { min: 1, max: 20_000 };
const YEAR_RANGE = { min: 1000, max: 2100 };
const SERIES_POSITION_RANGE = { min: 1, max: 999 };
const MAX_SHORT_TEXT = 255;
const MAX_DESCRIPTION = 20_000;
const MAX_URL = 2048;

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

function isbnOf(
    errors: FormErrors,
    body: Body,
    state: DemoState,
): string | null {
    const raw = textOf(body.isbn_13);

    if (raw === null) {
        return null;
    }

    const isbn13 = toIsbn13(raw);

    if (isbn13 === null) {
        errors.add('isbn_13', 'ISBN inválido.');

        return null;
    }

    if (state.tables.books.some((book) => book.isbn_13 === isbn13)) {
        errors.add('isbn_13', 'Esse livro já está na biblioteca.');
    }

    return isbn13;
}

function statusOf(errors: FormErrors, value: unknown): ReadingStatus {
    const status = READING_STATUSES.find(
        (candidate) => candidate === textOf(value),
    );

    if (status === undefined) {
        errors.add(
            'status',
            textOf(value) === null
                ? 'O campo estante é obrigatório.'
                : 'O valor escolhido para estante é inválido.',
        );
    }

    return status ?? READING_STATUSES[0];
}

function sourceOf(value: unknown): BookSource {
    const source = textOf(value);

    return (
        BOOK_SOURCES.find((candidate) => candidate === source) ?? DEFAULT_SOURCE
    );
}

function coverUrlOf(errors: FormErrors, value: unknown): string | null {
    const url = textOf(value);

    if (url === null) {
        return null;
    }

    if (!isHttpUrl(url)) {
        errors.add('cover_url', 'O campo capa deve ser um link válido.');
    }

    checkMaxLength(
        errors,
        'cover_url',
        url,
        MAX_URL,
        'O campo capa deve ter no máximo :max caracteres.',
    );

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

/** StoreBookRequest: the form's fields as a new book. Every failing rule adds its error to `errors`. */
export function parseNewBook(
    body: Body,
    state: DemoState,
    today: string,
    errors: FormErrors,
): NewBook {
    const title = textOf(body.title);

    if (title === null) {
        errors.add('title', 'Informe o título.');
    }

    const subtitle = textOf(body.subtitle);
    const publisher = textOf(body.publisher);
    const genre = textOf(body.genre);
    const series = textOf(body.series);
    const description = textOf(body.description);

    checkMaxLength(
        errors,
        'title',
        title,
        MAX_SHORT_TEXT,
        'O campo título deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'subtitle',
        subtitle,
        MAX_SHORT_TEXT,
        'O campo subtítulo deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'publisher',
        publisher,
        MAX_SHORT_TEXT,
        'O campo editora deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'genre',
        genre,
        MAX_SHORT_TEXT,
        'O campo gênero deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'series',
        series,
        MAX_SHORT_TEXT,
        'O campo series deve ter no máximo :max caracteres.',
    );
    checkMaxLength(
        errors,
        'description',
        description,
        MAX_DESCRIPTION,
        'O campo descrição deve ter no máximo :max caracteres.',
    );

    const isbn13 = isbnOf(errors, body, state);
    const pages = wholeNumberField(
        errors,
        'pages',
        body.pages,
        PAGES_RANGE,
        'Número de páginas inválido.',
    );
    const publishedYear = wholeNumberField(
        errors,
        'published_year',
        body.published_year,
        YEAR_RANGE,
        'Ano inválido.',
    );
    const seriesPosition = wholeNumberField(
        errors,
        'series_position',
        body.series_position,
        SERIES_POSITION_RANGE,
        'Volume inválido.',
    );
    const finishedOn = textOf(body.finished_on);

    checkDayFormat(
        errors,
        'finished_on',
        finishedOn,
        'O campo término deve estar no formato :format.',
    );

    if (finishedOn !== null && finishedOn > today) {
        errors.add('finished_on', 'O término não pode ser depois de hoje.');
    }

    return {
        title: title ?? '',
        subtitle,
        authors: authorsOf(body.authors),
        isbn13,
        publisher,
        publishedYear,
        pages,
        genre,
        series,
        seriesPosition,
        description,
        coverUrl: coverUrlOf(errors, body.cover_url),
        source: sourceOf(body.source),
        status: statusOf(errors, body.status),
        finishedOn:
            finishedOn !== null && isDayText(finishedOn) ? finishedOn : null,
        undated: TRUE_FLAGS.includes(body.undated),
    };
}
