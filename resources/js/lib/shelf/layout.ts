import { SHELF_BOOK_MAX_HEIGHT, spineSize } from './spine-size';
import type { SpineBook } from '@/types';

export const SPINE_GAP = 3;

/** What stands on a shelf row: one upright book, or lying books piled on top of each other. */
export type ShelfItem =
    | { kind: 'book'; book: SpineBook }
    | { kind: 'stack'; books: SpineBook[] };

export function shelfItemKey(item: ShelfItem): number {
    return item.kind === 'book' ? item.book.id : item.books[0].id;
}

export function shelfItemWidth(item: ShelfItem, scale: number): number {
    const books = item.kind === 'book' ? [item.book] : item.books;

    return Math.max(...books.map((book) => spineSize(book, scale).width));
}

/** Piles lying books from the shelf up, starting a new pile when the next book would rise above the tallest upright one. */
function pileLyingBooks(books: SpineBook[], scale: number): ShelfItem[] {
    const maxHeight = Math.round(SHELF_BOOK_MAX_HEIGHT * scale);
    const piles: SpineBook[][] = [];
    let pile: SpineBook[] = [];
    let height = 0;

    for (const book of books) {
        const bookHeight = spineSize(book, scale).height;

        if (height + bookHeight > maxHeight && pile.length > 0) {
            piles.push(pile);
            pile = [];
            height = 0;
        }

        pile.push(book);
        height += bookHeight;
    }

    if (pile.length > 0) {
        piles.push(pile);
    }

    return piles.map((books) => ({ kind: 'stack', books }));
}

/** Fills each row of a shelf until the next item would not fit; lying books go last, in piles. */
export function packRows(
    books: SpineBook[],
    usableWidth: number,
    scale: number,
): ShelfItem[][] {
    const items: ShelfItem[] = [
        ...books
            .filter((book) => !book.is_lying_down)
            .map((book): ShelfItem => ({ kind: 'book', book })),
        ...pileLyingBooks(
            books.filter((book) => book.is_lying_down),
            scale,
        ),
    ];
    const rows: ShelfItem[][] = [];
    let row: ShelfItem[] = [];
    let used = 0;

    for (const item of items) {
        const needed = shelfItemWidth(item, scale) + SPINE_GAP;

        if (used + needed > usableWidth && row.length > 0) {
            rows.push(row);
            row = [];
            used = 0;
        }

        row.push(item);
        used += needed;
    }

    if (row.length > 0) {
        rows.push(row);
    }

    return rows;
}
