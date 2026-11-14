import { useState } from 'react';
import { Bookend } from '@/components/bookshelf/bookend';
import {
    Cabinet,
    Compartment,
    cabinetMetrics,
} from '@/components/bookshelf/cabinet';
import { FlatStack } from '@/components/bookshelf/flat-stack';
import { Pager } from '@/components/bookshelf/pager';
import { Spine } from '@/components/bookshelf/spine';
import { useElementWidth } from '@/hooks/use-element-width';
import { layoutRows, paginate, rowBooks } from '@/lib/shelf/layout';
import type { ShelfItem } from '@/lib/shelf/layout';
import { cn } from '@/lib/utils';
import type { SpineBook } from '@/types';

const MAX_CABINET_WIDTH = 1040;
const NARROW_CABINET_WIDTH = 640;
const NARROW_SCALE = 0.78;

export function Bookshelf({
    books,
    onMove,
    rowsPerPage,
}: {
    books: SpineBook[];
    /** Without it the shelf is read-only; with it, spines can be dragged. */
    onMove?: (bookId: number, beforeBookId: number | null) => void;
    /** Without it every row is shown; with it the shelf is paged like a fixed bookcase. */
    rowsPerPage?: number;
}) {
    const [ref, width] = useElementWidth();
    const [requestedPage, setRequestedPage] = useState(0);
    const [dragging, setDragging] = useState<number | null>(null);
    const [isOver, setIsOver] = useState(false);
    const isEditable = onMove !== undefined;

    const cabinetWidth = Math.min(width, MAX_CABINET_WIDTH);
    const scale = cabinetWidth < NARROW_CABINET_WIDTH ? NARROW_SCALE : 1;
    const metrics = cabinetMetrics(scale);
    const usableWidth = cabinetWidth - 2 * (metrics.side + metrics.padding);
    const pages = paginate(layoutRows(books, usableWidth, scale), rowsPerPage);
    const page = Math.min(requestedPage, pages.length - 1);
    const visibleRows = pages[page];
    const isPaged = pages.length > 1;
    const targetRows = rowsPerPage ?? visibleRows.length;
    const emptyRows = Math.max(0, targetRows - visibleRows.length);

    // A drop on empty shelf space must land after the last visible book, not at the end of the library.
    const nextPageFirstBook = pages[page + 1]?.flatMap(rowBooks)[0];
    const endAnchorId = nextPageFirstBook?.id ?? null;

    function drop(beforeBookId: number | null) {
        setIsOver(false);

        if (dragging !== null && dragging !== beforeBookId) {
            onMove?.(dragging, beforeBookId);
        }

        setDragging(null);
    }

    function renderItem(item: ShelfItem, index: number) {
        switch (item.kind) {
            case 'spine':
                return (
                    <Spine
                        key={item.book.id}
                        book={item.book}
                        scale={scale}
                        tilt={item.tilt}
                        leanOffset={item.leanOffset}
                        isDraggable={isEditable}
                        onDragStart={() => setDragging(item.book.id)}
                        onDragEnd={() => setDragging(null)}
                        onDropBefore={() => drop(item.book.id)}
                    />
                );
            case 'gap':
                return (
                    <span
                        key={`gap-${index}`}
                        aria-hidden
                        className="shrink-0"
                        style={{ width: item.width }}
                    />
                );
            case 'bookend':
                return <Bookend key={`bookend-${index}`} scale={scale} />;
            case 'stack':
                return (
                    <FlatStack
                        key={`stack-${index}`}
                        books={item.books}
                        scale={scale}
                    />
                );
        }
    }

    return (
        <div ref={ref} className="flex flex-col gap-5">
            <div
                className={cn('mx-auto w-full', isOver && 'opacity-90')}
                style={{ maxWidth: MAX_CABINET_WIDTH }}
                onDragOver={(event) => {
                    if (isEditable && dragging !== null) {
                        event.preventDefault();
                        setIsOver(true);
                    }
                }}
                onDragLeave={() => setIsOver(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    drop(endAnchorId);
                }}
            >
                <Cabinet scale={scale}>
                    {visibleRows.map((row, index) => (
                        <Compartment key={index} scale={scale}>
                            {row.items.map(renderItem)}
                        </Compartment>
                    ))}
                    {Array.from({ length: emptyRows }, (_, index) => (
                        <Compartment key={`empty-${index}`} scale={scale} />
                    ))}
                </Cabinet>
            </div>
            {isPaged && (
                <Pager
                    page={page}
                    pageCount={pages.length}
                    onChange={setRequestedPage}
                />
            )}
        </div>
    );
}
