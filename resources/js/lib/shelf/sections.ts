import type { BookcaseShelf, LibraryBook, SpineBook } from '@/types';

/** One shelf as drawn: a named shelf, or the unnamed one holding books that belong to none. */
export type ShelfSection = {
    key: string;
    shelfId: number | null;
    name: string | null;
    isRemovable: boolean;
    books: SpineBook[];
};

const UNSHELVED_KEY = 'unshelved';

export function unshelvedSection(books: SpineBook[]): ShelfSection {
    return {
        key: UNSHELVED_KEY,
        shelfId: null,
        name: null,
        isRemovable: false,
        books,
    };
}

export function buildSections(
    books: LibraryBook[],
    shelves: BookcaseShelf[],
    { includeEmpty }: { includeEmpty: boolean },
): ShelfSection[] {
    const ordered = [...books].sort((a, b) => a.shelf_rank - b.shelf_rank);
    const shelfIds = new Set(shelves.map((shelf) => shelf.id));
    const sections = shelves
        .map((shelf) => ({
            key: String(shelf.id),
            shelfId: shelf.id,
            name: shelf.name,
            isRemovable: !shelf.is_catch_all,
            books: ordered.filter((book) => book.bookshelf_id === shelf.id),
        }))
        .filter((section) => includeEmpty || section.books.length > 0);
    const unshelved = ordered.filter(
        (book) =>
            book.bookshelf_id === null || !shelfIds.has(book.bookshelf_id),
    );

    return unshelved.length > 0
        ? [...sections, unshelvedSection(unshelved)]
        : sections;
}
