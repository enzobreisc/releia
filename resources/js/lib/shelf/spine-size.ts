import { identityFor } from './publisher-identity';
import type { SpineBook } from '@/types';

/** Real proportions: a book's thickness follows its pages and its height follows the publisher's format. */
const PIXELS_PER_MM = 1.2;
const PAPER_MM_PER_PAGE = 0.05;
const BOARDS_MM = 3;
const MIN_WIDTH = 18;
const MAX_WIDTH = 78;
const DEFAULT_PAGES = 280;
const TALLEST_BOOK_CM = 23.5;
const MM_PER_CM = 10;

export const SHELF_BOOK_MAX_HEIGHT = Math.ceil(
    TALLEST_BOOK_CM * MM_PER_CM * PIXELS_PER_MM,
);

export type SpineSize = { width: number; height: number };

export function spineSize(book: SpineBook, scale: number): SpineSize {
    const pages = book.pages ?? DEFAULT_PAGES;
    const thicknessMm = pages * PAPER_MM_PER_PAGE + BOARDS_MM;
    const heightMm = identityFor(book.publisher_key).heightCm * MM_PER_CM;

    return {
        width: Math.round(
            Math.min(
                MAX_WIDTH,
                Math.max(MIN_WIDTH, thicknessMm * PIXELS_PER_MM),
            ) * scale,
        ),
        height: Math.round(heightMm * PIXELS_PER_MM * scale),
    };
}
