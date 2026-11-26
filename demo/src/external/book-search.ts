import { genreFromSubjects } from '../support/genres';
import { isBrazilianIsbn, toIsbn10, toIsbn13 } from '../support/isbn';
import { normalizeSearch } from '../support/names';
import {
    type BookCandidate,
    candidateOf,
    fillFrom,
    isComplete,
    positiveIntOf,
    textOf,
    uniqueAuthors,
    yearOf,
} from './book-candidate';
import { arrayOf, recordOf, stringsOf } from '../support/json-fields';
import { coverUrlOf, workKeyOf } from './open-library-keys';
import { findInBrasilApi } from './isbn';
import {
    createJsonClient,
    type JsonClient,
    REQUEST_TIMEOUT_MS,
} from './json-request';

type LookupOptions = { timeoutMs?: number };

type EditionList = { editions: BookCandidate[]; isComplete: boolean };

type Doc = Record<string, unknown>;

const OPEN_LIBRARY_URL = 'https://openlibrary.org';
const SEARCH_FIELDS =
    'key,title,subtitle,author_name,first_publish_year,isbn,number_of_pages_median,subject,cover_i,edition_count,want_to_read_count,ratings_count';
const SEARCH_LIMIT = 10;
const EDITIONS_PER_PAGE = 200;
const EDITION_PAGES = 5;
const EDITIONS_BUDGET_MS = 12_000;
const LANGUAGE_KEY_PREFIX = /^.*\//;

/** Results of a lookup that worked are kept for the session; failures are asked again. */
const remembered = new Map<string, unknown>();

export function clearLookupCache(): void {
    remembered.clear();
}

async function remember<T>(
    key: string,
    load: () => Promise<T>,
    shouldKeep: (value: T) => boolean,
): Promise<T> {
    if (remembered.has(key)) {
        return remembered.get(key) as T;
    }

    const value = await load();

    if (shouldKeep(value)) {
        remembered.set(key, value);
    }

    return value;
}

function timeoutOf(options: LookupOptions): number {
    return options.timeoutMs ?? REQUEST_TIMEOUT_MS;
}

/** Works come with the ISBNs of all their editions; a Brazilian one is preferred, else the first. */
function pickIsbn(values: readonly unknown[]): string | null {
    const isbns = values.flatMap((value) => {
        const isbn = typeof value === 'string' ? toIsbn13(value) : null;

        return isbn === null ? [] : [isbn];
    });

    return isbns.find(isBrazilianIsbn) ?? isbns[0] ?? null;
}

function titledDocs(body: unknown): Doc[] {
    return arrayOf(recordOf(body)?.docs)
        .map(recordOf)
        .filter(
            (doc): doc is Doc => doc !== null && textOf(doc.title) !== null,
        );
}

function firstDocOf(body: unknown): Doc | null {
    return recordOf(arrayOf(recordOf(body)?.docs)[0]);
}

function candidateFromSearchDoc(doc: Doc): BookCandidate {
    const isbn13 = pickIsbn(arrayOf(doc.isbn));

    return candidateOf({
        title: textOf(doc.title) ?? '',
        source: 'open_library',
        isbn13,
        isbn10: isbn13 === null ? null : toIsbn10(isbn13),
        subtitle: textOf(doc.subtitle),
        authors: uniqueAuthors(arrayOf(doc.author_name)),
        publishedYear: yearOf(doc.first_publish_year),
        pages: positiveIntOf(doc.number_of_pages_median),
        genre: genreFromSubjects(stringsOf(doc.subject)),
        coverUrl: coverUrlOf(positiveIntOf(doc.cover_i)),
        workKey: workKeyOf(textOf(doc.key)),
        editionCount: positiveIntOf(doc.edition_count),
    });
}

async function searchOpenLibrary(
    term: string,
    publisher: string | null,
    client: JsonClient,
): Promise<BookCandidate[]> {
    const query: Record<string, string> = {
        q: term,
        fields: SEARCH_FIELDS,
        limit: String(SEARCH_LIMIT),
    };

    if (publisher !== null) {
        query.publisher = publisher;
    }

    const body = await client.get('/search.json', query);

    return titledDocs(body).map(candidateFromSearchDoc);
}

/** Open Library's search, with a second try by title alone when the publisher filter finds nothing. */
export async function searchBooks(
    query: string,
    publisher: string | null,
    options: LookupOptions = {},
): Promise<BookCandidate[]> {
    const term = query.trim();

    if (term === '') {
        return [];
    }

    const isbn13 = toIsbn13(term);

    if (isbn13 !== null) {
        const book = await findBookByIsbn(isbn13, options);

        return book === null ? [] : [book];
    }

    const wantedPublisher = normalizeSearch(publisher ?? '') || null;

    return remember(
        `search:v3:${term.toLowerCase()}|${wantedPublisher ?? ''}`,
        async () => {
            const client = createJsonClient(
                OPEN_LIBRARY_URL,
                timeoutOf(options),
            );
            const results = await searchOpenLibrary(
                term,
                wantedPublisher,
                client,
            );

            if (results.length === 0 && wantedPublisher !== null) {
                return searchOpenLibrary(term, null, client);
            }

            return results;
        },
        (results) => results.length > 0,
    );
}

function nameOf(value: unknown): string | null {
    return textOf(recordOf(value)?.name);
}

async function openLibraryByIsbn(
    isbn13: string,
    client: JsonClient,
): Promise<BookCandidate | null> {
    const key = `ISBN:${isbn13}`;
    const data = recordOf(
        await client.get('/api/books', {
            bibkeys: key,
            jscmd: 'data',
            format: 'json',
        }),
    );
    const book = recordOf(data?.[key]);
    const title = textOf(book?.title);

    if (book === null || title === null) {
        return null;
    }

    const cover = recordOf(book.cover);
    const candidate = candidateOf({
        title,
        source: 'open_library',
        isbn13,
        isbn10: toIsbn10(isbn13),
        subtitle: textOf(book.subtitle),
        authors: uniqueAuthors(arrayOf(book.authors).map(nameOf)),
        publisher: nameOf(arrayOf(book.publishers)[0]),
        publishedYear: yearOf(book.publish_date),
        pages: positiveIntOf(book.number_of_pages),
        genre: genreFromSubjects(stringsOf(arrayOf(book.subjects).map(nameOf))),
        coverUrl: textOf(cover?.large ?? cover?.medium),
    });

    if (candidate.pages !== null && candidate.genre !== null) {
        return candidate;
    }

    return fillFromWork(candidate, isbn13, client);
}

/** The edition often lacks a page count; the work carries the median across its editions. */
async function fillFromWork(
    candidate: BookCandidate,
    isbn13: string,
    client: JsonClient,
): Promise<BookCandidate> {
    const work = firstDocOf(
        await client.get('/search.json', {
            isbn: isbn13,
            fields: 'number_of_pages_median,subject',
            limit: '1',
        }),
    );

    if (work === null) {
        return candidate;
    }

    return fillFrom(
        candidate,
        candidateOf({
            title: candidate.title,
            source: 'open_library',
            pages: positiveIntOf(work.number_of_pages_median),
            genre: genreFromSubjects(stringsOf(work.subject)),
        }),
    );
}

/** The metadata of one ISBN: Open Library first, then BrasilAPI while the record is incomplete. */
export async function findBookByIsbn(
    isbn13: string,
    options: LookupOptions = {},
): Promise<BookCandidate | null> {
    return remember(
        `isbn:${isbn13}`,
        async () => {
            const timeoutMs = timeoutOf(options);
            const client = createJsonClient(OPEN_LIBRARY_URL, timeoutMs);
            const book = await openLibraryByIsbn(isbn13, client);

            if (book !== null && isComplete(book)) {
                return book;
            }

            const other = await findInBrasilApi(isbn13, timeoutMs);

            if (other === null) {
                return book;
            }

            return book === null ? other : fillFrom(book, other);
        },
        (book) => book !== null,
    );
}

function editionFrom(entry: unknown, workKey: string): BookCandidate | null {
    const record = recordOf(entry);
    const title = textOf(record?.title);

    if (record === null || title === null) {
        return null;
    }

    const isbn13 = pickIsbn([
        ...arrayOf(record.isbn_13),
        ...arrayOf(record.isbn_10),
    ]);
    const languageKey = textOf(recordOf(arrayOf(record.languages)[0])?.key);
    const coverId = positiveIntOf(arrayOf(record.covers)[0]);

    return candidateOf({
        title,
        source: 'open_library',
        isbn13,
        isbn10: isbn13 === null ? null : toIsbn10(isbn13),
        subtitle: textOf(record.subtitle),
        publisher: textOf(arrayOf(record.publishers)[0]),
        publishedYear: yearOf(record.publish_date),
        pages: positiveIntOf(record.number_of_pages),
        coverUrl: coverUrlOf(coverId),
        workKey,
        language:
            languageKey === null
                ? null
                : languageKey.replace(LANGUAGE_KEY_PREFIX, ''),
    });
}

/** Open Library lists several editions of a work with the same ISBN; the first one stays. */
function distinctByIsbn(editions: readonly BookCandidate[]): BookCandidate[] {
    const byIsbn = new Map<string, BookCandidate>();

    for (const edition of editions) {
        if (edition.isbn13 !== null && !byIsbn.has(edition.isbn13)) {
            byIsbn.set(edition.isbn13, edition);
        }
    }

    return [...byIsbn.values()].sort((left, right) =>
        compareRanks(rankOf(right), rankOf(left)),
    );
}

function rankOf(edition: BookCandidate): number[] {
    return [
        isBrazilianIsbn(edition.isbn13 ?? '') ? 1 : 0,
        edition.coverUrl === null ? 0 : 1,
        edition.publishedYear ?? 0,
    ];
}

function compareRanks(
    left: readonly number[],
    right: readonly number[],
): number {
    const difference = left.findIndex((value, index) => value !== right[index]);

    return difference === -1
        ? 0
        : (left[difference] ?? 0) - (right[difference] ?? 0);
}

async function loadEditions(
    workKey: string,
    options: LookupOptions,
): Promise<EditionList> {
    const client = createJsonClient(OPEN_LIBRARY_URL, timeoutOf(options));
    const deadline = Date.now() + EDITIONS_BUDGET_MS;
    const found: BookCandidate[] = [];

    for (let page = 0; page < EDITION_PAGES; page++) {
        if (page > 0 && Date.now() > deadline) {
            return { editions: distinctByIsbn(found), isComplete: false };
        }

        const body = await client.get(`/works/${workKey}/editions.json`, {
            limit: String(EDITIONS_PER_PAGE),
            offset: String(page * EDITIONS_PER_PAGE),
        });

        if (client.hasJustFailed()) {
            return { editions: distinctByIsbn(found), isComplete: false };
        }

        const entries = arrayOf(recordOf(body)?.entries);

        found.push(
            ...entries.flatMap((entry) => {
                const edition = editionFrom(entry, workKey);

                return edition === null ? [] : [edition];
            }),
        );

        if (entries.length < EDITIONS_PER_PAGE) {
            break;
        }
    }

    return { editions: distinctByIsbn(found), isComplete: true };
}

/**
 * The editions of a work with ISBNs, Brazilian first, then with a cover, then the most recent.
 * Only a complete list is kept, so the missing editions are asked for again.
 */
export async function editionsOfWork(
    workKey: string,
    options: LookupOptions = {},
): Promise<BookCandidate[]> {
    const list = await remember(
        `editions:v2:${workKey}`,
        () => loadEditions(workKey, options),
        (value) => value.isComplete && value.editions.length > 0,
    );

    return list.editions;
}
