import { translateText } from '@/lib/i18n';
import type {
    BookcaseShelf,
    LibraryBook,
    SetupBook,
    Shelf,
    ShelfGroupingOption,
    ShelfGroupingValue,
} from '@/types';
import {
    groupOf,
    groupsOf,
    SHELF_GROUPINGS,
    shelfIdOf,
    shelvesInOrder,
} from '../domain/bookcase';
import { bookOf, readingsOfBook } from '../domain/books';
import {
    countByCurrentStatus,
    genresOf,
    type LibraryFilter,
    type LibrarySort,
    libraryBooks,
} from '../domain/library';
import type { ReadModel } from '../domain/read-model';
import { shelfOrderIds, sortedShelfIds } from '../domain/shelf-order';
import type { BookRow, BookshelfRow, ReadingStatus } from '../state/types';
import { readingShelfLabel } from '../support/labels';
import { spineBook } from './books';

type LibraryProps = {
    books: LibraryBook[];
    bookcase: BookcaseShelf[];
    shelves: Shelf[];
    genres: string[];
    filters: {
        q: string;
        genre: string;
        shelf: ReadingStatus | null;
        sort: LibrarySort;
    };
};

type BookcaseSetupProps = {
    books: SetupBook[];
    groupings: ShelfGroupingOption[];
    has_shelves: boolean;
};

/** Shelf tabs after "All", in the order the library shows them. */
const SHELF_TAB_ORDER: readonly ReadingStatus[] = [
    'reading',
    'want_to_read',
    'read',
    'abandoned',
];

const GROUPING_LABELS: Record<ShelfGroupingValue, string> = {
    publisher: 'Editora',
    author: 'Autor',
    genre: 'Gênero',
    series: 'Série',
};

const ALL_SHELVES_LABEL = 'Todos';

type LibraryContext = {
    shelfRanks: ReadonlyMap<number, number>;
    queuePositions: ReadonlyMap<number, number>;
    shelves: BookshelfRow[];
};

function libraryContext(model: ReadModel): LibraryContext {
    return {
        shelfRanks: new Map<number, number>(
            shelfOrderIds(model).map((id, rank): [number, number] => [
                id,
                rank,
            ]),
        ),
        queuePositions: new Map<number, number>(
            model.queueItems.map((item): [number, number] => [
                item.book_id,
                item.position,
            ]),
        ),
        shelves: shelvesInOrder(model.state.tables),
    };
}

function rankOf(context: LibraryContext, bookId: number): number {
    const rank = context.shelfRanks.get(bookId);

    if (rank === undefined) {
        throw new Error(`Book ${bookId} has no place in the shelf order.`);
    }

    return rank;
}

/** LibraryController::index, one book: its spine, its slot in the line and its shelf. */
function libraryBook(
    model: ReadModel,
    context: LibraryContext,
    book: BookRow,
): LibraryBook {
    return {
        ...spineBook(model, book, {
            queuePosition: context.queuePositions.get(book.id) ?? null,
            readingsCount: readingsOfBook(model, book.id).length,
        }),
        shelf_rank: rankOf(context, book.id),
        bookshelf_id: shelfIdOf(model, context.shelves, book),
    };
}

function bookcaseShelves(model: ReadModel): BookcaseShelf[] {
    return shelvesInOrder(model.state.tables).map((shelf) => ({
        id: shelf.id,
        name: shelf.name,
        is_catch_all: shelf.is_catch_all === 1,
    }));
}

function shelfTabs(model: ReadModel): Shelf[] {
    const counts = countByCurrentStatus(model);
    const allTab: Shelf = {
        value: null,
        label: translateText(model.locale, ALL_SHELVES_LABEL),
        count: model.state.tables.books.length,
    };

    return [
        allTab,
        ...SHELF_TAB_ORDER.map((status) => ({
            value: status,
            label: readingShelfLabel(model.locale, status),
            count: counts.get(status) ?? 0,
        })),
    ];
}

/** The library page: the books that match the filter, and the counts and lists that do not change with it. */
export function libraryProps(
    model: ReadModel,
    filter: LibraryFilter,
): LibraryProps {
    const context = libraryContext(model);

    return {
        books: libraryBooks(model, filter).map((book) =>
            libraryBook(model, context, book),
        ),
        bookcase: bookcaseShelves(model),
        shelves: shelfTabs(model),
        genres: genresOf(model),
        filters: {
            q: filter.query,
            genre: filter.genre,
            shelf: filter.shelf,
            sort: filter.sort,
        },
    };
}

function groupingLabel(model: ReadModel, grouping: ShelfGroupingValue): string {
    return translateText(model.locale, GROUPING_LABELS[grouping]);
}

function groupKeysOfBook(
    model: ReadModel,
    book: BookRow,
): Record<ShelfGroupingValue, string | null> {
    return {
        publisher: groupOf(model, 'publisher', book)?.key ?? null,
        author: groupOf(model, 'author', book)?.key ?? null,
        genre: groupOf(model, 'genre', book)?.key ?? null,
        series: groupOf(model, 'series', book)?.key ?? null,
    };
}

function setupBook(model: ReadModel, book: BookRow): SetupBook {
    return {
        ...spineBook(model, book),
        group_keys: groupKeysOfBook(model, book),
    };
}

/** BookcaseSetupController::create: every book in line order, with its group under each grouping. */
export function bookcaseSetupProps(model: ReadModel): BookcaseSetupProps {
    return {
        books: sortedShelfIds(model).map((id) =>
            setupBook(model, bookOf(model, id)),
        ),
        groupings: SHELF_GROUPINGS.map((grouping) => ({
            value: grouping,
            label: groupingLabel(model, grouping),
            groups: groupsOf(model, grouping),
        })),
        has_shelves: model.state.tables.bookshelves.length > 0,
    };
}
