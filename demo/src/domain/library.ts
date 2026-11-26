import type { BookRow, ReadingStatus } from '../state/types';
import { compareText } from '../support/collections';
import { normalizeSearch } from '../support/names';
import { currentReadingOf } from './books';
import type { ReadModel } from './read-model';

const LIBRARY_SORTS = ['recent', 'title', 'rating'] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

const READING_STATUSES: readonly ReadingStatus[] = [
    'want_to_read',
    'reading',
    'read',
    'abandoned',
];
const DEFAULT_SORT: LibrarySort = 'recent';
const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

export type LibraryFilter = {
    /** Trimmed, as the request sent it; matching normalizes it. */
    query: string;
    genre: string;
    shelf: ReadingStatus | null;
    sort: LibrarySort;
};

function queryParam(query: URLSearchParams, name: string): string {
    return (query.get(name) ?? '').trim();
}

function statusOf(value: string): ReadingStatus | null {
    return READING_STATUSES.find((status) => status === value) ?? null;
}

function sortOf(value: string): LibrarySort {
    return LIBRARY_SORTS.find((sort) => sort === value) ?? DEFAULT_SORT;
}

/** The library's query string. An unknown shelf or sort is ignored, as the controller does. */
export function parseLibraryFilter(query: URLSearchParams): LibraryFilter {
    return {
        query: queryParam(query, 'q'),
        genre: queryParam(query, 'genre'),
        shelf: statusOf(queryParam(query, 'shelf')),
        sort: sortOf(queryParam(query, 'sort')),
    };
}

/** A LIKE pattern for one search term: "%" and "_" are wildcards, as SQLite treats them. */
function likeTermPattern(term: string): RegExp {
    const source = Array.from(term, (character) => {
        if (character === '%') {
            return '.*';
        }

        if (character === '_') {
            return '.';
        }

        return character.replace(REGEX_SPECIAL_CHARACTERS, '\\$&');
    }).join('');

    return new RegExp(source, 'su');
}

function matchesEveryTerm(book: BookRow, query: string): boolean {
    return normalizeSearch(query)
        .split(' ')
        .filter((term) => term !== '')
        .every((term) => likeTermPattern(term).test(book.search_text));
}

function matchesFilter(
    model: ReadModel,
    filter: LibraryFilter,
    book: BookRow,
): boolean {
    const genreMatches = filter.genre === '' || book.genre === filter.genre;
    const shelfMatches =
        filter.shelf === null ||
        currentReadingOf(model, book.id)?.status === filter.shelf;

    return matchesEveryTerm(book, filter.query) && genreMatches && shelfMatches;
}

/** SQLite NOCASE: only A to Z fold to lower case. */
function foldAsciiCase(text: string): string {
    return text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

function compareById(left: BookRow, right: BookRow): number {
    return right.id - left.id;
}

function compareTitles(left: BookRow, right: BookRow): number {
    const titles = compareText(
        foldAsciiCase(left.title),
        foldAsciiCase(right.title),
    );

    return titles || compareById(left, right);
}

/** Descending, with nulls last. */
function compareNullableDesc(
    left: number | null,
    right: number | null,
): number {
    if (left === right) {
        return 0;
    }

    if (left === null) {
        return 1;
    }

    return right === null ? -1 : right - left;
}

function currentRatingOf(model: ReadModel, book: BookRow): number | null {
    return currentReadingOf(model, book.id)?.rating ?? null;
}

function compareRatings(
    model: ReadModel,
): (left: BookRow, right: BookRow) => number {
    return (left, right) =>
        compareNullableDesc(
            currentRatingOf(model, left),
            currentRatingOf(model, right),
        ) || compareById(left, right);
}

function comparatorFor(
    model: ReadModel,
    sort: LibrarySort,
): (left: BookRow, right: BookRow) => number {
    switch (sort) {
        case 'recent':
            return compareById;
        case 'title':
            return compareTitles;
        case 'rating':
            return compareRatings(model);
    }
}

/** The library's books, filtered and sorted as LibraryController::index does. */
export function libraryBooks(
    model: ReadModel,
    filter: LibraryFilter,
): BookRow[] {
    return [...model.bookById.values()]
        .filter((book) => matchesFilter(model, filter, book))
        .sort(comparatorFor(model, filter.sort));
}

/** Book::currentReading per book: a reread counts only on the shelf of its latest reading. */
export function countByCurrentStatus(
    model: ReadModel,
): Map<ReadingStatus, number> {
    const counts = new Map<ReadingStatus, number>();

    for (const reading of model.currentReadingByBook.values()) {
        counts.set(reading.status, (counts.get(reading.status) ?? 0) + 1);
    }

    return counts;
}

/** Distinct, non-empty genres in byte order, as the SQL query sorts them. */
export function genresOf(model: ReadModel): string[] {
    const genres = new Set(
        model.state.tables.books
            .map((book) => book.genre)
            .filter((genre): genre is string => genre !== null),
    );

    return [...genres].sort(compareText);
}
