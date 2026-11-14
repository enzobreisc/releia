import { spineSize } from './spine-size';
import type { SpineBook } from '@/types';

export type Tilt = 'none' | 'left' | 'right';

export type ShelfItem =
    | { kind: 'spine'; book: SpineBook; tilt: Tilt; leanOffset: number }
    | { kind: 'gap'; width: number }
    | { kind: 'bookend' }
    | { kind: 'stack'; books: SpineBook[] };

export type ShelfRow = { items: ShelfItem[] };

export const SPINE_GAP = 2;
export const LEAN_LEFT_DEGREES = 12;
export const LEAN_RIGHT_DEGREES = 11;

const BORROWED_GAP_EVERY = 13;
const BORROWED_GAP_MARGIN = 22;
const STACK_SIZE = 3;
const MIN_UPRIGHTS_FOR_STACK = 5;

function degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

function leanOffset(book: SpineBook, scale: number): number {
    return Math.round(
        spineSize(book, scale).height *
            Math.sin(degreesToRadians(LEAN_LEFT_DEGREES)),
    );
}

/** A decorative space where a book is "out on loan": the one before it leans into the gap. */
function hasBorrowedGap(book: SpineBook): boolean {
    return book.id % BORROWED_GAP_EVERY === 0;
}

function gapWidth(book: SpineBook, scale: number): number {
    return (
        Math.round(
            spineSize(book, scale).height *
                Math.sin(degreesToRadians(LEAN_RIGHT_DEGREES)),
        ) + Math.round(BORROWED_GAP_MARGIN * scale)
    );
}

function footprint(book: SpineBook, scale: number): number {
    return (
        spineSize(book, scale).width +
        SPINE_GAP +
        (hasBorrowedGap(book) ? gapWidth(book, scale) : 0)
    );
}

function packRows(
    books: SpineBook[],
    usableWidth: number,
    scale: number,
): { books: SpineBook[]; used: number }[] {
    const rows: { books: SpineBook[]; used: number }[] = [];
    let current = { books: [] as SpineBook[], used: 0 };

    for (const book of books) {
        const needed = footprint(book, scale);

        if (current.used + needed > usableWidth && current.books.length > 0) {
            rows.push(current);
            current = { books: [], used: 0 };
        }

        current.books.push(book);
        current.used += needed;
    }

    if (current.books.length > 0) {
        rows.push(current);
    }

    return rows;
}

function decorate(
    row: { books: SpineBook[]; used: number },
    isFinal: boolean,
    usableWidth: number,
    scale: number,
): ShelfRow {
    const uprights = [...row.books];
    const flats =
        isFinal && uprights.length >= MIN_UPRIGHTS_FOR_STACK
            ? uprights.splice(-STACK_SIZE)
            : [];
    const leftover = usableWidth - row.used;
    const items: ShelfItem[] = [];

    uprights.forEach((book, index) => {
        const isLast = index === uprights.length - 1;

        if (hasBorrowedGap(book)) {
            items.push({ kind: 'spine', book, tilt: 'right', leanOffset: 0 });
            items.push({ kind: 'gap', width: gapWidth(book, scale) });
        } else if (isLast && !isFinal && leftover >= leanOffset(book, scale)) {
            items.push({
                kind: 'spine',
                book,
                tilt: 'left',
                leanOffset: leanOffset(book, scale),
            });
        } else {
            items.push({ kind: 'spine', book, tilt: 'none', leanOffset: 0 });
        }
    });

    if (flats.length > 0) {
        items.push({ kind: 'bookend' });
        items.push({ kind: 'stack', books: flats });
    }

    return { items };
}

export function layoutRows(
    books: SpineBook[],
    usableWidth: number,
    scale: number,
): ShelfRow[] {
    const packed = packRows(books, usableWidth, scale);

    return packed.map((row, index) =>
        decorate(row, index === packed.length - 1, usableWidth, scale),
    );
}

export function paginate(
    rows: ShelfRow[],
    rowsPerPage: number | undefined,
): ShelfRow[][] {
    if (rowsPerPage === undefined || rows.length === 0) {
        return [rows];
    }

    const pages: ShelfRow[][] = [];

    for (let start = 0; start < rows.length; start += rowsPerPage) {
        pages.push(rows.slice(start, start + rowsPerPage));
    }

    return pages;
}

export function rowBooks(row: ShelfRow): SpineBook[] {
    return row.items.flatMap((item) =>
        item.kind === 'spine'
            ? [item.book]
            : item.kind === 'stack'
              ? item.books
              : [],
    );
}
