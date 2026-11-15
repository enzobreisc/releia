import { identityFor } from './publisher-identity';
import type { SpineBook } from '@/types';

/** A book's thickness follows its pages and its height follows the publisher's format, both exaggerated so a spine stays readable. */
const PIXELS_PER_CM = 10.5;
const BASE_WIDTH = 34;
const PIXELS_PER_PAGE = 0.06;
const MIN_WIDTH = 46;
const MAX_WIDTH = 84;
const DEFAULT_PAGES = 280;
const TALLEST_BOOK_CM = 23.5;

export const SHELF_BOOK_MAX_HEIGHT = Math.ceil(TALLEST_BOOK_CM * PIXELS_PER_CM);

export type SpineSize = { width: number; height: number };

export function spineSize(book: SpineBook, scale: number): SpineSize {
    const pages = book.pages ?? DEFAULT_PAGES;
    const width = BASE_WIDTH + pages * PIXELS_PER_PAGE;
    const height = identityFor(book.publisher_key).heightCm * PIXELS_PER_CM;

    const thickness = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));

    return book.is_lying_down
        ? {
              width: Math.round(height * scale),
              height: Math.round(thickness * scale),
          }
        : {
              width: Math.round(thickness * scale),
              height: Math.round(height * scale),
          };
}
