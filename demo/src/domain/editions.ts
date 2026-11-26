import type { BookCandidate } from '../external/book-candidate';
import { isBrazilianIsbn } from '../support/isbn';
import { normalizeSearch } from '../support/names';
import type { DemoState } from '../state/types';

const NON_ALPHANUMERIC = /[^a-z0-9 ]+/g;
const GENERIC_PUBLISHER_WORDS = /\b(editora|editorial|edicoes|ed)\b/g;
const WHITESPACE_RUN = /\s+/g;

/** Mirrors PreferredPublishers::normalize, so editions rank as the app ranks them. */
function preferredPublisherKey(publisher: string | null): string {
    return normalizeSearch(publisher ?? '')
        .replace(NON_ALPHANUMERIC, ' ')
        .replace(GENERIC_PUBLISHER_WORDS, ' ')
        .replace(WHITESPACE_RUN, ' ')
        .trim();
}

/** How many books of the library each publisher has, by publisher key. */
function libraryPublisherCounts(state: DemoState): Map<string, number> {
    const counts = new Map<string, number>();

    for (const book of state.tables.books) {
        if (book.publisher === null) {
            continue;
        }

        const key = preferredPublisherKey(book.publisher);

        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
}

/** Brazilian editions first; among them, the publishers of the library come before the others. */
function rankOf(
    edition: BookCandidate,
    counts: ReadonlyMap<string, number>,
): number[] {
    return [
        isBrazilianIsbn(edition.isbn13 ?? '') ? 1 : 0,
        counts.get(preferredPublisherKey(edition.publisher)) ?? 0,
    ];
}

function compareDescending(
    left: readonly number[],
    right: readonly number[],
): number {
    return (right[0] ?? 0) - (left[0] ?? 0) || (right[1] ?? 0) - (left[1] ?? 0);
}

/**
 * Keeps the editions of the wanted publisher (accent-insensitive, when one is given) and orders
 * them as the app does. The sort is stable, so editions that tie keep their order.
 */
export function orderEditions(
    state: DemoState,
    editions: readonly BookCandidate[],
    publisher: string | null,
): BookCandidate[] {
    const wanted = normalizeSearch(publisher ?? '');
    const matching =
        wanted === ''
            ? [...editions]
            : editions.filter((edition) =>
                  normalizeSearch(edition.publisher ?? '').includes(wanted),
              );
    const counts = libraryPublisherCounts(state);

    return matching.sort((left, right) =>
        compareDescending(rankOf(left, counts), rankOf(right, counts)),
    );
}
