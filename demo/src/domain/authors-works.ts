import type { AuthorRow, BookRow } from '../state/types';
import {
    isAuthorNameTitle,
    isSimilarName,
    normalizeTitle,
} from './authors-identity';
import { isBrazilianIsbn, toIsbn13 } from '../support/isbn';

const MAX_WORKS = 30;
const SHARED_NAME_WORK_RATIO = 3;

type WorkItem = {
    title: string;
    year: number | null;
    cover_url: string | null;
    work_key: string | null;
    edition_count: number | null;
    portuguese: boolean;
    isbn_13: string | null;
};

export type AuthorWorks = {
    verified: boolean;
    owns_all: boolean;
    items: WorkItem[];
};

/** A work of an author as Open Library's search returns it, with the ISBN-13s of its editions. */
export type OpenLibraryWork = {
    title: string;
    authors: string[];
    isbns: string[];
    portuguese: boolean;
    publishedYear: number | null;
    coverUrl: string | null;
    workKey: string | null;
    editionCount: number | null;
};

export type AuthorNameKey = { name: string; key: string };

export const UNVERIFIED_WORKS: AuthorWorks = {
    verified: false,
    owns_all: false,
    items: [],
};

/** Author keys stored on the author, comma separated. Empty when the identity is not known yet. */
export function storedAuthorKeys(author: AuthorRow): string[] {
    return author.open_library_key ? author.open_library_key.split(',') : [];
}

/** Title and ISBN keys of the books a person owns, as AuthorService compares them with works. */
export function ownedKeysOf(books: readonly BookRow[]): ReadonlySet<string> {
    const keys = books.flatMap((book) => [
        `title:${normalizeTitle(book.title)}`,
        ...[book.isbn_13, book.isbn_10].flatMap((isbn) =>
            isbn ? [`isbn:${toIsbn13(isbn) ?? isbn}`] : [],
        ),
    ]);

    return new Set(keys);
}

export function matchingAuthorKeys(
    pairs: readonly AuthorNameKey[],
    name: string,
): string[] {
    return pairs
        .filter((pair) => isSimilarName(pair.name, name))
        .map((pair) => pair.key);
}

/** Only a work whose title or ISBN is already owned counts as a match. */
export function isOwnedWork(
    work: OpenLibraryWork,
    owned: ReadonlySet<string>,
): boolean {
    const keys = [
        `title:${normalizeTitle(work.title)}`,
        ...work.isbns.map((isbn) => `isbn:${isbn}`),
    ];

    return keys.some((key) => owned.has(key));
}

/** The works a person does not own yet, filtered as AuthorService::works filters them. */
export function worksMissingFrom(
    works: readonly OpenLibraryWork[],
    owned: ReadonlySet<string>,
    authorName: string,
): AuthorWorks {
    const items: WorkItem[] = [];
    const seenTitles = new Set<string>();
    let ownedCount = 0;
    let missingCount = 0;

    for (const work of works) {
        if (items.length >= MAX_WORKS) {
            break;
        }

        const brazilianIsbns = work.isbns.filter(isBrazilianIsbn);

        if (!work.portuguese || brazilianIsbns.length === 0) {
            continue;
        }

        if (isOwnedWork(work, owned)) {
            ownedCount++;
            continue;
        }

        missingCount++;

        const title = normalizeTitle(work.title);

        if (
            isSkippedTitle(title, work, owned, authorName) ||
            seenTitles.has(title)
        ) {
            continue;
        }

        seenTitles.add(title);
        items.push(workItem(work, brazilianIsbns[0] ?? null));
    }

    return {
        verified: true,
        owns_all: ownedCount > 0 && missingCount === 0,
        items,
    };
}

function isSkippedTitle(
    title: string,
    work: OpenLibraryWork,
    owned: ReadonlySet<string>,
    authorName: string,
): boolean {
    return (
        title === '' ||
        owned.has(`title:${title}`) ||
        isAuthorNameTitle(work.title, [...work.authors, authorName])
    );
}

function workItem(work: OpenLibraryWork, isbn13: string | null): WorkItem {
    return {
        title: work.title,
        year: work.publishedYear,
        cover_url: work.coverUrl,
        work_key: work.workKey,
        edition_count: work.editionCount,
        portuguese: true,
        isbn_13: isbn13,
    };
}

/** A name shared by several authors is only trusted when one of them clearly has more works. */
export function hasDominantWorkCount(
    topWorks: number,
    nextWorks: number,
): boolean {
    return topWorks >= SHARED_NAME_WORK_RATIO * nextWorks;
}
