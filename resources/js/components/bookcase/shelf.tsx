import { useState } from 'react';
import type { ReactNode } from 'react';
import { Spine } from '@/components/bookcase/spine';
import { cardClass } from '@/components/card';
import { useTranslation } from '@/hooks/use-translation';
import { packRows, shelfItemKey } from '@/lib/shelf/layout';
import type { ShelfSection } from '@/lib/shelf/sections';
import { SHELF_BOOK_MAX_HEIGHT } from '@/lib/shelf/spine-size';
import { cn } from '@/lib/utils';
import type { SpineBook } from '@/types';

const CARD_PADDING = 20;
const RAIL_INSET = 8;
const EMPTY_ROW_HEIGHT = 72;

export type ShelfDrag = {
    isDragging: boolean;
    onStart: (bookId: number) => void;
    onEnd: () => void;
    onDrop: (beforeBookId: number | null) => void;
};

export function Shelf({
    section,
    width,
    scale,
    drag,
    onTogglePosture,
    actions,
}: {
    section: ShelfSection;
    width: number;
    scale: number;
    /** Without it the shelf is read-only. */
    drag?: ShelfDrag;
    /** Without it the books cannot be laid down or stood up. */
    onTogglePosture?: (book: SpineBook) => void;
    actions?: ReactNode;
}) {
    const { t, plural, translateText } = useTranslation();
    const [isOver, setIsOver] = useState(false);
    const rows = packRows(
        section.books,
        width - 2 * (CARD_PADDING + RAIL_INSET),
        scale,
    );
    const rowHeight = Math.round(SHELF_BOOK_MAX_HEIGHT * scale);

    function renderSpine(book: SpineBook) {
        return (
            <Spine
                key={book.id}
                book={book}
                scale={scale}
                drag={
                    drag && {
                        onStart: () => drag.onStart(book.id),
                        onEnd: drag.onEnd,
                        onDropBefore: () => drag.onDrop(book.id),
                    }
                }
                onTogglePosture={
                    onTogglePosture && (() => onTogglePosture(book))
                }
            />
        );
    }

    return (
        <section
            aria-label={section.name ?? t('Estante')}
            onDragOver={(event) => {
                if (drag?.isDragging) {
                    event.preventDefault();
                    setIsOver(true);
                }
            }}
            onDragLeave={() => setIsOver(false)}
            onDrop={(event) => {
                event.preventDefault();
                setIsOver(false);
                drag?.onDrop(null);
            }}
            className={cardClass(
                cn('flex flex-col gap-4', isOver && 'inset-ring-primary'),
            )}
            style={{ padding: CARD_PADDING }}
        >
            {section.name !== null && (
                <header className="flex min-h-10 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-2.5">
                        <h2 className="truncate text-lg font-extrabold tracking-tight">
                            {translateText(section.name)}
                        </h2>
                        <span className="shrink-0 font-mono text-[11px] text-muted">
                            {plural(section.books.length, 'livro', 'livros')}
                        </span>
                    </div>
                    {actions}
                </header>
            )}
            {rows.map((row) => (
                <div
                    key={shelfItemKey(row[0])}
                    className="flex items-end border-b-2 border-strong"
                    style={{ minHeight: rowHeight, paddingInline: RAIL_INSET }}
                >
                    {row.map((item) =>
                        item.kind === 'book' ? (
                            renderSpine(item.book)
                        ) : (
                            <div
                                key={shelfItemKey(item)}
                                className="flex flex-col-reverse"
                            >
                                {item.books.map(renderSpine)}
                            </div>
                        ),
                    )}
                </div>
            ))}
            {rows.length === 0 && (
                <p
                    className="flex items-center justify-center border-b-2 border-strong font-mono text-xs text-faint"
                    style={{ minHeight: EMPTY_ROW_HEIGHT }}
                >
                    {drag ? t('Arraste livros para cá') : t('(vazio)')}
                </p>
            )}
        </section>
    );
}
