import { spineSize } from './spine-size';
import type { SpineBook } from '@/types';

export const SPINE_GAP = 3;

/** Fills each row of a shelf until the next spine would not fit. */
export function packRows(
    books: SpineBook[],
    usableWidth: number,
    scale: number,
): SpineBook[][] {
    const rows: SpineBook[][] = [];
    let row: SpineBook[] = [];
    let used = 0;

    for (const book of books) {
        const needed = spineSize(book, scale).width + SPINE_GAP;

        if (used + needed > usableWidth && row.length > 0) {
            rows.push(row);
            row = [];
            used = 0;
        }

        row.push(book);
        used += needed;
    }

    if (row.length > 0) {
        rows.push(row);
    }

    return rows;
}
