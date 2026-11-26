import type { BookRow } from '../state/types';
import { authorSurname, normalizeSearch } from '../support/names';
import { authorsOf } from './books';
import { comparePhpKeys, type PhpValue } from './php-compare';
import type { ReadModel } from './read-model';

type SortKey = readonly PhpValue[];

/** One book in the library line: its sort key, and its slot when someone placed it by hand. */
type LineEntry = {
    id: number;
    key: SortKey;
    shelfPosition: number | null;
};

/** ShelfOrder::sortKey: a standalone book sorts by its title, as if it were a series of one. */
function sortKeyOf(model: ReadModel, book: BookRow): SortKey {
    const author = authorsOf(model, book.id)[0]?.name ?? null;

    return [
        author === null ? 1 : 0,
        authorSurname(author),
        normalizeSearch(author ?? ''),
        normalizeSearch(book.series ?? book.title),
        book.series_position ?? 0,
        normalizeSearch(book.title),
        book.id,
    ];
}

function lineEntriesOf(model: ReadModel): LineEntry[] {
    return model.state.tables.books.map((book) => ({
        id: book.id,
        key: sortKeyOf(model, book),
        shelfPosition: book.shelf_position,
    }));
}

function compareByKey(left: LineEntry, right: LineEntry): number {
    return comparePhpKeys(left.key, right.key);
}

function compareByPlacement(left: LineEntry, right: LineEntry): number {
    return (
        (left.shelfPosition ?? 0) - (right.shelfPosition ?? 0) ||
        left.id - right.id
    );
}

/** Slides each unplaced book in before the first placed book that sorts after it. */
function mergeBySortKey(
    placed: readonly LineEntry[],
    unplaced: readonly LineEntry[],
): LineEntry[] {
    const order = [...placed];
    let cursor = 0;

    for (const entry of unplaced) {
        while (cursor < order.length) {
            const current = order[cursor];

            if (
                current === undefined ||
                comparePhpKeys(current.key, entry.key) > 0
            ) {
                break;
            }

            cursor++;
        }

        order.splice(cursor, 0, entry);
        cursor++;
    }

    return order;
}

function orderedLine(model: ReadModel): LineEntry[] {
    const entries = lineEntriesOf(model);
    const placed = entries
        .filter((entry) => entry.shelfPosition !== null)
        .sort(compareByPlacement);
    const unplaced = entries
        .filter((entry) => entry.shelfPosition === null)
        .sort(compareByKey);

    return mergeBySortKey(placed, unplaced);
}

/** ShelfOrder::ids: the whole library line, first slot to last. */
export function shelfOrderIds(model: ReadModel): number[] {
    return orderedLine(model).map((entry) => entry.id);
}

/** ShelfOrder::sortedIds: the line as it stands when nobody has placed a book by hand. */
export function sortedShelfIds(model: ReadModel): number[] {
    return lineEntriesOf(model)
        .sort(compareByKey)
        .map((entry) => entry.id);
}

function reorderLine(
    order: readonly number[],
    bookId: number,
    beforeBookId: number | null,
): number[] {
    const rest = order.filter((id) => id !== bookId);
    const index = beforeBookId === null ? -1 : rest.indexOf(beforeBookId);
    const insertAt = index === -1 ? rest.length : index;

    return [...rest.slice(0, insertAt), bookId, ...rest.slice(insertAt)];
}

/** Writes each book's index in the line into shelf_position; the other columns stay as they are. */
function saveShelfPositions(model: ReadModel, order: readonly number[]): void {
    order.forEach((id, position) => {
        const book = model.bookById.get(id);

        if (book !== undefined && book.shelf_position !== position) {
            book.shelf_position = position;
        }
    });
}

/** ShelfOrder::move: the book goes right before `beforeBookId`, or to the end when that is null. */
export function moveBookInLine(
    model: ReadModel,
    bookId: number,
    beforeBookId: number | null,
): void {
    if (beforeBookId === bookId) {
        return;
    }

    const order = reorderLine(shelfOrderIds(model), bookId, beforeBookId);

    saveShelfPositions(model, order);
}
