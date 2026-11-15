import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { BookMove } from '@/components/bookcase';
import type { ShelfSection } from '@/lib/shelf/sections';
import { move, posture } from '@/routes/books';
import { destroy } from '@/routes/bookshelves';
import type { LibraryBook, SpineBook } from '@/types';

type NamedShelf = { id: number; name: string };

/** `null` is the dialog for a new shelf; a shelf is the one being renamed. */
type NameDialog = { shelf: NamedShelf | null };

export function useBookcaseEditing(books: LibraryBook[]) {
    const [nameDialog, setNameDialog] = useState<NameDialog | null>(null);
    const [mergingShelf, setMergingShelf] = useState<NamedShelf | null>(null);

    function moveBook({ bookId, beforeBookId, shelfId }: BookMove) {
        const current = books.find((book) => book.id === bookId)?.bookshelf_id;

        // Sending the shelf pins the book to it, so a move within its own shelf leaves it following its group.
        router.patch(
            move(bookId).url,
            {
                before_book_id: beforeBookId,
                ...(shelfId === current ? {} : { bookshelf_id: shelfId }),
            },
            { preserveScroll: true },
        );
    }

    function toggleBookPosture(book: SpineBook) {
        router.patch(
            posture(book.id).url,
            { is_lying_down: !book.is_lying_down },
            { preserveScroll: true },
        );
    }

    function removeShelf(section: ShelfSection) {
        if (section.shelfId !== null) {
            router.delete(destroy.url(section.shelfId), {
                preserveScroll: true,
            });
        }
    }

    function renameShelf(section: ShelfSection) {
        if (section.shelfId !== null && section.name !== null) {
            setNameDialog({
                shelf: { id: section.shelfId, name: section.name },
            });
        }
    }

    function mergeShelf(section: ShelfSection) {
        if (section.shelfId !== null && section.name !== null) {
            setMergingShelf({ id: section.shelfId, name: section.name });
        }
    }

    return {
        nameDialog,
        mergingShelf,
        mergeShelf,
        closeMergeDialog: () => setMergingShelf(null),
        moveBook,
        toggleBookPosture,
        removeShelf,
        renameShelf,
        addShelf: () => setNameDialog({ shelf: null }),
        closeNameDialog: () => setNameDialog(null),
    };
}
