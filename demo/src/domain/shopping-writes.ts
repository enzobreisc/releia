import { addBook, type NewBook } from './library-writes';
import type { ShoppingItemInput } from './shopping-input';
import { QUEUE_ON_BUY_KEY } from './shopping';
import {
    authorNamesOf,
    bookCoverUrl,
    currentReadingOf,
    readingsOfBook,
} from './books';
import type { ReadModel } from './read-model';
import { removeRows } from './cascade';
import { sessionsOf } from './readings';
import { writeSetting } from './settings';
import {
    addToQueue,
    findQueueItemOfBook,
    nextRowId,
    removeBookFromQueue,
} from './queue-writes';
import { localDateTime } from '../state/dates';
import type { BookRow, DemoState, ShoppingItemRow } from '../state/types';

const MANUAL_BOOK_SOURCE = 'manual';
const WANT_TO_READ = 'want_to_read';

function stampOf(now: Date): string {
    return localDateTime(now);
}

/** ShoppingService::add: a new item on the list, with the price typed in when there is one. */
export function addShoppingItem(
    state: DemoState,
    input: ShoppingItemInput,
    now: Date,
): ShoppingItemRow {
    const stamp = stampOf(now);
    const item: ShoppingItemRow = {
        id: nextRowId(state.tables.shopping_items),
        book_id: null,
        title: input.title,
        author: input.author,
        isbn: input.isbn,
        cover_url: input.cover_url,
        cover_path: null,
        url: input.url,
        store_type: input.store_type,
        is_priority: 0,
        estimated_price_cents: input.estimated_price_cents,
        price_checked_at: input.estimated_price_cents === null ? null : stamp,
        bought_at: null,
        created_at: stamp,
        updated_at: stamp,
    };

    state.tables.shopping_items.push(item);

    return item;
}

/** An empty price clears the noted price, and with it the date it was checked. */
export function setShoppingPrice(
    item: ShoppingItemRow,
    cents: number | null,
    now: Date,
): void {
    const stamp = stampOf(now);

    item.estimated_price_cents = cents;
    item.price_checked_at = cents === null ? null : stamp;
    item.updated_at = stamp;
}

export function setShoppingPriority(
    item: ShoppingItemRow,
    isPriority: boolean,
    now: Date,
): void {
    item.is_priority = isPriority ? 1 : 0;
    item.updated_at = stampOf(now);
}

export function deleteShoppingItems(
    state: DemoState,
    ids: ReadonlySet<number>,
): void {
    removeRows(state, 'shopping_items', ids);
}

function linkedBookOf(
    state: DemoState,
    item: ShoppingItemRow,
): BookRow | undefined {
    return item.book_id === null
        ? undefined
        : state.tables.books.find((book) => book.id === item.book_id);
}

/** ShoppingService::bookFor: the book already linked, or the one with the same ISBN, or a new one on "want to read". */
function bookForPurchase(
    state: DemoState,
    item: ShoppingItemRow,
    now: Date,
): BookRow {
    const linked = linkedBookOf(state, item);

    if (linked !== undefined) {
        return linked;
    }

    const sameIsbn =
        item.isbn === null
            ? undefined
            : state.tables.books.find((book) => book.isbn_13 === item.isbn);

    if (sameIsbn !== undefined) {
        return sameIsbn;
    }

    return addBook(state, manualBookOf(item), now);
}

function manualBookOf(item: ShoppingItemRow): NewBook {
    return {
        title: item.title,
        subtitle: null,
        authors: item.author === '' ? [] : [item.author],
        isbn13: item.isbn,
        publisher: null,
        publishedYear: null,
        pages: null,
        genre: null,
        series: null,
        seriesPosition: null,
        description: null,
        coverUrl: item.cover_url,
        source: MANUAL_BOOK_SOURCE,
        status: WANT_TO_READ,
        finishedOn: null,
        undated: false,
    };
}

/** ShoppingService::buy: the item becomes a book on "want to read", and joins the queue when asked. */
export function buyShoppingItem(
    state: DemoState,
    item: ShoppingItemRow,
    joinQueue: boolean,
    now: Date,
): void {
    if (item.bought_at !== null) {
        return;
    }

    const book = bookForPurchase(state, item, now);
    const stamp = stampOf(now);

    item.book_id = book.id;
    item.bought_at = stamp;
    item.updated_at = stamp;

    if (joinQueue) {
        addToQueue(state, book.id, now);
    }
}

/**
 * ShoppingService::unbuy: the purchase is undone, the book stays in the library. The book
 * leaves the queue only if the purchase put it there and it was never started.
 */
export function unbuyShoppingItem(
    state: DemoState,
    model: ReadModel,
    item: ShoppingItemRow,
    now: Date,
): void {
    const boughtAt = item.bought_at;
    const bookId = item.book_id;

    item.bought_at = null;
    item.updated_at = stampOf(now);

    if (boughtAt === null || bookId === null) {
        return;
    }

    const queued = findQueueItemOfBook(state, bookId);

    if (
        queued !== undefined &&
        isUnstarted(model, bookId) &&
        queued.added_at >= boughtAt
    ) {
        removeBookFromQueue(state, bookId);
    }
}

function isUnstarted(model: ReadModel, bookId: number): boolean {
    const reading = currentReadingOf(model, bookId);

    return (
        reading?.status === WANT_TO_READ &&
        sessionsOf(model, reading.id).length === 0
    );
}

export function setQueueOnBuy(
    state: DemoState,
    queueOnBuy: boolean,
    today: string,
): void {
    writeSetting(state, QUEUE_ON_BUY_KEY, queueOnBuy, today);
}

/**
 * ShoppingService::fromWishlist eligibility: a want-to-read book with no session, no note
 * and no other reading.
 */
export function canMoveToShopping(model: ReadModel, book: BookRow): boolean {
    const reading = currentReadingOf(model, book.id);

    return (
        reading?.status === WANT_TO_READ &&
        readingsOfBook(model, book.id).length <= 1 &&
        sessionsOf(model, reading.id).length === 0 &&
        !model.state.tables.notes.some((note) => note.book_id === book.id)
    );
}

/** Takes an eligible book off "want to read" and puts it on the shopping list, unpriced. */
export function moveBookToShopping(
    state: DemoState,
    model: ReadModel,
    book: BookRow,
    now: Date,
): ShoppingItemRow {
    const item = addShoppingItem(
        state,
        {
            title: book.title,
            author: authorNamesOf(model, book.id),
            isbn: book.isbn_13,
            cover_url: bookCoverUrl(book),
            url: null,
            store_type: 'online',
            estimated_price_cents: null,
        },
        now,
    );

    removeRows(state, 'books', new Set([book.id]));

    return item;
}
