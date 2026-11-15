import { useState } from 'react';
import type { ReactNode } from 'react';
import { Shelf } from '@/components/bookcase/shelf';
import { useElementWidth } from '@/hooks/use-element-width';
import type { ShelfSection } from '@/lib/shelf/sections';
import type { SpineBook } from '@/types';

const NARROW_WIDTH = 640;
const NARROW_SCALE = 0.78;

export type BookMove = {
    bookId: number;
    beforeBookId: number | null;
    shelfId: number | null;
};

export function Bookcase({
    sections,
    onMove,
    onTogglePosture,
    renderActions,
}: {
    sections: ShelfSection[];
    /** Without it the bookcase is read-only; with it, spines can be dragged within and between shelves. */
    onMove?: (move: BookMove) => void;
    /** Without it the books cannot be laid down or stood up. */
    onTogglePosture?: (book: SpineBook) => void;
    renderActions?: (section: ShelfSection) => ReactNode;
}) {
    const [ref, width] = useElementWidth();
    const [dragging, setDragging] = useState<number | null>(null);
    const scale = width < NARROW_WIDTH ? NARROW_SCALE : 1;

    function drop(section: ShelfSection, beforeBookId: number | null) {
        if (dragging !== null && dragging !== beforeBookId) {
            onMove?.({
                bookId: dragging,
                beforeBookId,
                shelfId: section.shelfId,
            });
        }

        setDragging(null);
    }

    return (
        <div ref={ref} className="flex flex-col gap-5">
            {sections.map((section) => (
                <Shelf
                    key={section.key}
                    section={section}
                    width={width}
                    scale={scale}
                    drag={
                        onMove && {
                            isDragging: dragging !== null,
                            onStart: setDragging,
                            onEnd: () => setDragging(null),
                            onDrop: (beforeBookId) =>
                                drop(section, beforeBookId),
                        }
                    }
                    onTogglePosture={onTogglePosture}
                    actions={renderActions?.(section)}
                />
            ))}
        </div>
    );
}
