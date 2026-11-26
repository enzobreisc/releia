import type { ShelfGroupingValue } from '@/types';
import { localDateTime } from '../state/dates';
import type { BookRow, BookshelfRow, DemoTables } from '../state/types';
import { groupKeysOf, groupsOf } from './bookcase';
import type { ReadModel } from './read-model';

export type ShelfPlan = {
    name: string;
    groupKeys: string[];
};

export type OrganizeInput = {
    grouping: ShelfGroupingValue;
    shelves: ShelfPlan[];
    catchAllName: string;
};

type NewShelf = {
    name: string;
    position: number;
    grouping: ShelfGroupingValue | null;
    groupKeys: string[] | null;
    isCatchAll: boolean;
};

function nextBookshelfId(tables: DemoTables): number {
    return 1 + Math.max(0, ...tables.bookshelves.map((shelf) => shelf.id));
}

function bookshelfRow(id: number, shelf: NewShelf, now: Date): BookshelfRow {
    const timestamp = localDateTime(now);

    return {
        id,
        name: shelf.name,
        position: shelf.position,
        grouping: shelf.grouping,
        group_keys:
            shelf.groupKeys === null ? null : JSON.stringify(shelf.groupKeys),
        is_catch_all: shelf.isCatchAll ? 1 : 0,
        created_at: timestamp,
        updated_at: timestamp,
    };
}

/** A shelf keeps only the groups that exist, and is dropped when none of them do. */
function plansWithKnownGroups(
    plans: readonly ShelfPlan[],
    knownGroups: ReadonlySet<string>,
): ShelfPlan[] {
    return plans
        .map((plan) => ({
            name: plan.name,
            groupKeys: plan.groupKeys.filter((key) => knownGroups.has(key)),
        }))
        .filter((plan) => plan.groupKeys.length > 0);
}

/**
 * Bookcase::organize: the given shelves in order, each claiming its known groups, and a
 * catch-all shelf for the rest. Hand-made placements and order are discarded.
 */
export function organizeBookcase(
    model: ReadModel,
    input: OrganizeInput,
    now: Date,
): void {
    const { tables } = model.state;
    const knownGroups = new Set(
        groupsOf(model, input.grouping).map((group) => group.key),
    );
    const firstId = nextBookshelfId(tables);
    const shelves: BookshelfRow[] = [];

    for (const book of tables.books) {
        book.bookshelf_id = null;
        book.shelf_position = null;
    }

    for (const plan of plansWithKnownGroups(input.shelves, knownGroups)) {
        shelves.push(
            bookshelfRow(
                firstId + shelves.length,
                {
                    name: plan.name,
                    position: shelves.length,
                    grouping: input.grouping,
                    groupKeys: plan.groupKeys,
                    isCatchAll: false,
                },
                now,
            ),
        );
    }

    shelves.push(
        bookshelfRow(
            firstId + shelves.length,
            {
                name: input.catchAllName,
                position: shelves.length,
                grouping: null,
                groupKeys: null,
                isCatchAll: true,
            },
            now,
        ),
    );
    tables.bookshelves = shelves;
}

/** Bookshelf::create by hand: a shelf with no groups, at the end of the bookcase. */
export function addShelf(tables: DemoTables, name: string, now: Date): void {
    const lastPosition = Math.max(
        0,
        ...tables.bookshelves.map((shelf) => shelf.position),
    );

    tables.bookshelves.push(
        bookshelfRow(
            nextBookshelfId(tables),
            {
                name,
                position: lastPosition + 1,
                grouping: null,
                groupKeys: null,
                isCatchAll: false,
            },
            now,
        ),
    );
}

export function renameShelf(
    shelf: BookshelfRow,
    name: string,
    now: Date,
): void {
    shelf.name = name;
    shelf.updated_at = localDateTime(now);
}

function mergedGroupKeys(
    kept: BookshelfRow,
    absorbed: BookshelfRow,
): string[] | null {
    const grouping = kept.grouping ?? absorbed.grouping;
    const keys = [kept, absorbed]
        .filter((shelf) => shelf.grouping === grouping)
        .flatMap(groupKeysOf);
    const unique = [...new Set(keys)];

    return unique.length === 0 ? null : unique;
}

function moveBooksOn(
    tables: DemoTables,
    fromShelfId: number,
    toShelfId: number | null,
): void {
    for (const book of tables.books) {
        if (book.bookshelf_id === fromShelfId) {
            book.bookshelf_id = toShelfId;
        }
    }
}

/** Bookcase::merge: the kept shelf takes over the groups and the hand-placed books of the absorbed one. */
export function mergeShelves(
    tables: DemoTables,
    kept: BookshelfRow,
    absorbed: BookshelfRow,
    now: Date,
): void {
    const groupKeys = mergedGroupKeys(kept, absorbed);

    kept.grouping = kept.grouping ?? absorbed.grouping;
    kept.group_keys = groupKeys === null ? null : JSON.stringify(groupKeys);
    kept.updated_at = localDateTime(now);
    moveBooksOn(tables, absorbed.id, kept.id);
    tables.bookshelves = tables.bookshelves.filter(
        (shelf) => shelf.id !== absorbed.id,
    );
}

/** Bookcase::removeShelf: books placed by hand go back to the shelf that claims their group. */
export function removeShelf(tables: DemoTables, shelf: BookshelfRow): void {
    moveBooksOn(tables, shelf.id, null);
    tables.bookshelves = tables.bookshelves.filter(
        (other) => other.id !== shelf.id,
    );
}

/** Bookcase::placeOn: null hands the book back to its group. */
export function placeBookOn(book: BookRow, shelfId: number | null): void {
    book.bookshelf_id = shelfId;
}

/** Book posture. updated_at stays put, since it versions the cover URL. */
export function setLyingDown(book: BookRow, isLyingDown: boolean): void {
    book.is_lying_down = isLyingDown ? 1 : 0;
}
