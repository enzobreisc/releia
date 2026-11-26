import { normalizeSearch } from '../support/names';
import type { BookSource } from '../state/types';

/** A book as an external catalogue describes it, before it is added to the library (BookCandidate). */
export type BookCandidate = {
    title: string;
    source: BookSource;
    isbn13: string | null;
    isbn10: string | null;
    subtitle: string | null;
    authors: string[];
    publisher: string | null;
    publishedYear: number | null;
    pages: number | null;
    genre: string | null;
    description: string | null;
    coverUrl: string | null;
    workKey: string | null;
    editionCount: number | null;
    language: string | null;
    popularity: number | null;
    brazilianIsbns: string[];
};

type CandidateFields = Pick<BookCandidate, 'title' | 'source'> &
    Partial<BookCandidate>;

export function candidateOf(fields: CandidateFields): BookCandidate {
    return {
        isbn13: null,
        isbn10: null,
        subtitle: null,
        authors: [],
        publisher: null,
        publishedYear: null,
        pages: null,
        genre: null,
        description: null,
        coverUrl: null,
        workKey: null,
        editionCount: null,
        language: null,
        popularity: null,
        brazilianIsbns: [],
        ...fields,
    };
}

/** Fills the empty fields from another source, never overwriting a value already set. */
export function fillFrom(
    candidate: BookCandidate,
    other: BookCandidate,
): BookCandidate {
    return {
        ...candidate,
        isbn13: candidate.isbn13 ?? other.isbn13,
        isbn10: candidate.isbn10 ?? other.isbn10,
        subtitle: candidate.subtitle ?? other.subtitle,
        authors:
            candidate.authors.length > 0 ? candidate.authors : other.authors,
        publisher: candidate.publisher ?? other.publisher,
        publishedYear: candidate.publishedYear ?? other.publishedYear,
        pages: candidate.pages ?? other.pages,
        genre: candidate.genre ?? other.genre,
        description: candidate.description ?? other.description,
        coverUrl: candidate.coverUrl ?? other.coverUrl,
        workKey: candidate.workKey ?? other.workKey,
        editionCount: candidate.editionCount ?? other.editionCount,
        language: candidate.language ?? other.language,
        popularity: candidate.popularity ?? other.popularity,
        brazilianIsbns:
            candidate.brazilianIsbns.length > 0
                ? candidate.brazilianIsbns
                : other.brazilianIsbns,
    };
}

/** Metadata is complete when nothing a later source could add is missing. */
export function isComplete(candidate: BookCandidate): boolean {
    return (
        candidate.pages !== null &&
        candidate.coverUrl !== null &&
        candidate.description !== null &&
        candidate.genre !== null
    );
}

export function textOf(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim() === '') {
        return null;
    }

    return value.trim();
}

export function positiveIntOf(value: unknown): number | null {
    const number =
        typeof value === 'string' && value.trim() !== ''
            ? Number(value)
            : value;

    return typeof number === 'number' && Number.isInteger(number) && number > 0
        ? number
        : null;
}

const YEAR_IN_TEXT = /\b(1[5-9]\d{2}|20\d{2})\b/;

/** Years come as numbers or inside free-form dates such as "3 dezembro 2019". */
export function yearOf(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
    }

    const match = typeof value === 'string' ? YEAR_IN_TEXT.exec(value) : null;

    return match === null ? null : Number(match[1]);
}

/** Repeated authors that differ only in accent or case count once ("Júnior" and "Junior"). */
export function uniqueAuthors(names: readonly unknown[]): string[] {
    const byKey = new Map<string, string>();

    for (const name of names) {
        const text = textOf(name);

        const key = normalizeSearch(text ?? '');

        if (text !== null && !byKey.has(key)) {
            byKey.set(key, text);
        }
    }

    return [...byKey.values()];
}
