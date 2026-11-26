import { cannedWorksFor } from '../domain/authors-canned-works';
import { arrayOf, isRecord, stringsOf } from '../support/json-fields';
import { isSameName, normalizeTitle } from '../domain/authors-identity';
import {
    type AuthorNameKey,
    type AuthorWorks,
    hasDominantWorkCount,
    matchingAuthorKeys,
    type OpenLibraryWork,
    ownedKeysOf,
    isOwnedWork,
    storedAuthorKeys,
    UNVERIFIED_WORKS,
    worksMissingFrom,
} from '../domain/authors-works';
import type { AuthorRow, BookRow } from '../state/types';
import { toIsbn13 } from '../support/isbn';
import { coverUrlOf, workKeyOf } from './open-library-keys';

const OPEN_LIBRARY_ORIGIN = 'https://openlibrary.org';
const COVERS_ORIGIN = 'https://covers.openlibrary.org';
const REQUEST_TIMEOUT_MS = 8000;
const WORKS_LANGUAGE = 'por';
const WORK_FIELDS =
    'key,title,author_name,first_publish_year,isbn,cover_i,edition_count,language';
const WORK_SEARCH_LIMIT = 100;
const TITLE_SEARCH_LIMIT = 10;
const AUTHOR_SEARCH_LIMIT = 10;
const BOOKS_CHECKED_FOR_KEYS = 5;
const PHOTO_RECORDS = 5;
const CONFIRMING_MIN_WORKS = 5;
const AUTHOR_KEY_PATTERN = /^OL\d+A$/;
const SUBTITLE_AFTER_PERIOD_PATTERN = /\.\s.*$/;

type AuthorCandidate = { key: string; workCount: number };

class OpenLibraryUnavailableError extends Error {}

function textOf(value: unknown): string | null {
    return typeof value === 'string' && value !== '' ? value : null;
}

function positiveIntOf(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
        ? value
        : null;
}

function docsOf(response: unknown): unknown[] {
    return isRecord(response) ? arrayOf(response.docs) : [];
}

function uniqueValues(values: readonly string[]): string[] {
    return [...new Set(values)];
}

/** Open Library's JSON API allows cross-origin reads; any failure is reported as one error. */
async function getJson(
    path: string,
    query: Record<string, string>,
): Promise<unknown> {
    const url = new URL(path, OPEN_LIBRARY_ORIGIN);
    url.search = new URLSearchParams(query).toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new OpenLibraryUnavailableError(
                `Open Library answered ${response.status}`,
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof OpenLibraryUnavailableError) {
            throw error;
        }

        throw new OpenLibraryUnavailableError(
            `Open Library could not be reached: ${String(error)}`,
        );
    } finally {
        clearTimeout(timer);
    }
}

async function searchDocs(query: Record<string, string>): Promise<unknown[]> {
    return docsOf(await getJson('/search.json', query));
}

function authorPairsOf(doc: unknown): AuthorNameKey[] {
    if (!isRecord(doc)) {
        return [];
    }

    const keys = arrayOf(doc.author_key);

    return arrayOf(doc.author_name).flatMap((name, index) => {
        const key = keys[index];

        return typeof name === 'string' && typeof key === 'string'
            ? [{ name, key }]
            : [];
    });
}

/** Catalog titles often read "Title. Subtitle"; only the part before the period identifies the book. */
function shortenTitle(title: string): string {
    return normalizeTitle(title.replace(SUBTITLE_AFTER_PERIOD_PATTERN, ''));
}

async function searchAuthorKeysForIsbn(
    isbn13: string,
    name: string,
): Promise<string[]> {
    const [doc] = await searchDocs({
        isbn: isbn13,
        fields: 'author_name,author_key',
        limit: '1',
    });

    return matchingAuthorKeys(authorPairsOf(doc), name);
}

async function searchAuthorKeysForTitle(
    title: string,
    name: string,
): Promise<string[]> {
    const wanted = shortenTitle(title);

    if (wanted === '') {
        return [];
    }

    const docs = await searchDocs({
        title: wanted,
        fields: 'title,author_name,author_key',
        limit: String(TITLE_SEARCH_LIMIT),
    });
    const pairs = docs.flatMap((doc) => {
        const title = isRecord(doc) ? textOf(doc.title) : null;

        return title !== null && shortenTitle(title) === wanted
            ? authorPairsOf(doc)
            : [];
    });

    return uniqueValues(matchingAuthorKeys(pairs, name));
}

async function sameNameAuthors(name: string): Promise<AuthorCandidate[]> {
    const response = await getJson('/search/authors.json', {
        q: name,
        limit: String(AUTHOR_SEARCH_LIMIT),
    });

    return docsOf(response).flatMap((doc): AuthorCandidate[] => {
        if (!isRecord(doc)) {
            return [];
        }

        const key = textOf(doc.key);
        const docName = textOf(doc.name);

        if (key === null || docName === null || !isSameName(docName, name)) {
            return [];
        }

        return [{ key, workCount: positiveIntOf(doc.work_count) ?? 0 }];
    });
}

async function searchAuthorKeysByName(name: string): Promise<string[]> {
    const matches = (await sameNameAuthors(name)).sort(
        (left, right) => right.workCount - left.workCount,
    );
    const [top, next] = matches;

    if (top === undefined) {
        return [];
    }

    if (
        next !== undefined &&
        !hasDominantWorkCount(top.workCount, next.workCount)
    ) {
        return [];
    }

    return matches.map((match) => match.key);
}

async function searchWorksByAuthorKeys(
    keys: readonly string[],
    language?: string,
): Promise<OpenLibraryWork[]> {
    const validKeys = keys.filter((key) => AUTHOR_KEY_PATTERN.test(key));

    if (validKeys.length === 0) {
        return [];
    }

    const docs = await searchDocs({
        q: validKeys.map((key) => `author_key:${key}`).join(' OR '),
        ...(language === undefined ? {} : { language }),
        sort: 'want_to_read',
        fields: WORK_FIELDS,
        limit: String(WORK_SEARCH_LIMIT),
    });

    return docs.flatMap((doc) => {
        const work = workOf(doc);

        return work === null ? [] : [work];
    });
}

function workOf(doc: unknown): OpenLibraryWork | null {
    if (!isRecord(doc)) {
        return null;
    }

    const title = textOf(doc.title);

    if (title === null) {
        return null;
    }

    const isbns = stringsOf(doc.isbn).flatMap((isbn) => {
        const isbn13 = toIsbn13(isbn);

        return isbn13 === null ? [] : [isbn13];
    });

    return {
        title,
        authors: stringsOf(doc.author_name),
        isbns,
        portuguese: stringsOf(doc.language).includes(WORKS_LANGUAGE),
        publishedYear: positiveIntOf(doc.first_publish_year),
        coverUrl: coverUrlOf(positiveIntOf(doc.cover_i)),
        workKey: workKeyOf(doc.key),
        editionCount: positiveIntOf(doc.edition_count),
    };
}

async function keysOfBook(book: BookRow, name: string): Promise<string[]> {
    const isbnKeys =
        book.isbn_13 === null
            ? []
            : await searchAuthorKeysForIsbn(book.isbn_13, name);
    const titleKeys = await searchAuthorKeysForTitle(book.title, name);

    return uniqueValues([...isbnKeys, ...titleKeys]);
}

async function keysFromBooks(
    name: string,
    books: readonly BookRow[],
): Promise<string[]> {
    for (const book of books.slice(0, BOOKS_CHECKED_FOR_KEYS)) {
        const keys = await keysOfBook(book, name);

        if (keys.length > 0) {
            return keys;
        }
    }

    return [];
}

/** Records with the author's exact name are trusted only when one of the person's books is among their works. */
async function confirmedByLibrary(
    name: string,
    authorBooks: readonly BookRow[],
): Promise<string[]> {
    const candidates = (await sameNameAuthors(name))
        .filter((candidate) => candidate.workCount >= CONFIRMING_MIN_WORKS)
        .map((candidate) => candidate.key);

    if (candidates.length === 0) {
        return [];
    }

    const owned = ownedKeysOf(authorBooks);
    const works = await searchWorksByAuthorKeys(candidates);

    return works.some((work) => isOwnedWork(work, owned)) ? candidates : [];
}

/** Open Library author keys, found the way AuthorService::keys finds them, but never stored in the demo. */
async function findAuthorKeys(
    author: AuthorRow,
    authorBooks: readonly BookRow[],
): Promise<string[]> {
    const stored = storedAuthorKeys(author);

    if (stored.length > 0) {
        return stored;
    }

    const fromBooks = await keysFromBooks(author.name, authorBooks);

    if (fromBooks.length > 0) {
        return fromBooks;
    }

    const byName = await searchAuthorKeysByName(author.name);

    if (byName.length > 0) {
        return byName;
    }

    return confirmedByLibrary(author.name, authorBooks);
}

async function fetchAuthorWorks(
    author: AuthorRow,
    authorBooks: readonly BookRow[],
    ownedBooks: readonly BookRow[],
): Promise<AuthorWorks> {
    const keys = await findAuthorKeys(author, authorBooks);

    if (keys.length === 0) {
        return UNVERIFIED_WORKS;
    }

    const works = await searchWorksByAuthorKeys(keys, WORKS_LANGUAGE);

    return worksMissingFrom(works, ownedKeysOf(ownedBooks), author.name);
}

/**
 * Other works of the author. When Open Library cannot be reached, the demo authors get a short
 * canned list and everyone else gets an unverified result, as the page shows for unknown authors.
 */
export async function loadAuthorWorks(
    author: AuthorRow,
    authorBooks: readonly BookRow[],
    ownedBooks: readonly BookRow[],
): Promise<AuthorWorks> {
    try {
        return await fetchAuthorWorks(author, authorBooks, ownedBooks);
    } catch {
        return cannedWorksFor(author.id) ?? UNVERIFIED_WORKS;
    }
}

async function authorPhotoUrl(key: string): Promise<string | null> {
    const record = await getJson(`/authors/${key}.json`, {});

    if (!isRecord(record)) {
        return null;
    }

    const [photoId] = arrayOf(record.photos).flatMap((id) => {
        const valid = positiveIntOf(id);

        return valid === null ? [] : [valid];
    });

    return photoId === undefined
        ? null
        : `${COVERS_ORIGIN}/a/id/${photoId}-M.jpg`;
}

/** The first Open Library photo of the author's records, or null when none is found or the network fails. */
export async function loadAuthorPhotoUrl(
    author: AuthorRow,
    authorBooks: readonly BookRow[],
): Promise<string | null> {
    try {
        const keys = (await findAuthorKeys(author, authorBooks)).slice(
            0,
            PHOTO_RECORDS,
        );
        const urls = await Promise.all(keys.map(authorPhotoUrl));

        return urls.find((url) => url !== null) ?? null;
    } catch {
        return null;
    }
}
