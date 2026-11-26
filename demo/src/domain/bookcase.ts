import type { ShelfGroupingValue } from '@/types';
import { normalizeSearch } from '../support/names';
import { publisherKey } from '../support/publisher-key';
import type { BookRow, BookshelfRow, DemoTables } from '../state/types';
import { authorsOf } from './books';
import { comparePhpKeys } from './php-compare';
import type { ReadModel } from './read-model';

export const SHELF_GROUPINGS: readonly ShelfGroupingValue[] = [
    'publisher',
    'author',
    'genre',
    'series',
];

type ShelfGroup = {
    key: string;
    label: string;
};

type ShelfGroupCount = ShelfGroup & {
    count: number;
};

export function isShelfGrouping(
    value: string | null,
): value is ShelfGroupingValue {
    return SHELF_GROUPINGS.some((grouping) => grouping === value);
}

export function isCatchAll(shelf: BookshelfRow): boolean {
    return shelf.is_catch_all === 1;
}

export function findBookshelf(
    tables: DemoTables,
    id: number,
): BookshelfRow | undefined {
    return tables.bookshelves.find((shelf) => shelf.id === id);
}

/** Bookshelf::group_keys is JSON text in the export. */
export function groupKeysOf(shelf: BookshelfRow): string[] {
    if (shelf.group_keys === null) {
        return [];
    }

    const parsed: unknown = JSON.parse(shelf.group_keys);

    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed.filter(
        (key: unknown): key is string => typeof key === 'string',
    );
}

/** Bookshelf order: position, then id. */
export function shelvesInOrder(tables: DemoTables): BookshelfRow[] {
    return [...tables.bookshelves].sort(
        (left, right) => left.position - right.position || left.id - right.id,
    );
}

function catchAllShelf(
    shelves: readonly BookshelfRow[],
): BookshelfRow | undefined {
    return shelves.find(isCatchAll);
}

function rawLabel(
    model: ReadModel,
    grouping: ShelfGroupingValue,
    book: BookRow,
): string | null {
    switch (grouping) {
        case 'publisher':
            return book.publisher;
        case 'author':
            return authorsOf(model, book.id)[0]?.name ?? null;
        case 'genre':
            return book.genre;
        case 'series':
            return book.series;
    }
}

/** ShelfGrouping::groupOf: null when the book has no value for the grouping. */
export function groupOf(
    model: ReadModel,
    grouping: ShelfGroupingValue,
    book: BookRow,
): ShelfGroup | null {
    const label = (rawLabel(model, grouping, book) ?? '').trim();
    const key =
        grouping === 'publisher' ? publisherKey(label) : normalizeSearch(label);

    return key === '' ? null : { key, label };
}

function claimsBook(
    model: ReadModel,
    shelf: BookshelfRow,
    book: BookRow,
): boolean {
    if (!isShelfGrouping(shelf.grouping)) {
        return false;
    }

    const group = groupOf(model, shelf.grouping, book);

    return group !== null && groupKeysOf(shelf).includes(group.key);
}

/**
 * Bookcase::shelfIds for one book: the shelf it was placed on by hand, else the first
 * shelf that claims its group, else the catch-all shelf.
 */
export function shelfIdOf(
    model: ReadModel,
    shelves: readonly BookshelfRow[],
    book: BookRow,
): number | null {
    return (
        book.bookshelf_id ??
        shelves.find((shelf) => claimsBook(model, shelf, book))?.id ??
        catchAllShelf(shelves)?.id ??
        null
    );
}

function compareGroupCounts(
    left: ShelfGroupCount,
    right: ShelfGroupCount,
): number {
    return comparePhpKeys([right.count, left.key], [left.count, right.key]);
}

/** Bookcase::groups: the groups of a grouping, largest first. Books are read in id order. */
export function groupsOf(
    model: ReadModel,
    grouping: ShelfGroupingValue,
): ShelfGroupCount[] {
    const counts = new Map<string, ShelfGroupCount>();
    const books = [...model.state.tables.books].sort(
        (left, right) => left.id - right.id,
    );

    for (const book of books) {
        const group = groupOf(model, grouping, book);

        if (group === null) {
            continue;
        }

        const counted = counts.get(group.key);

        if (counted === undefined) {
            counts.set(group.key, { ...group, count: 1 });
        } else {
            counted.count++;
        }
    }

    return [...counts.values()].sort(compareGroupCounts);
}
