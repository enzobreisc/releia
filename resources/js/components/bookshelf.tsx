import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import {
    SPINE_MAX_HEIGHT,
    SPINE_RECESSED_BACKGROUND,
    SPINE_RECESSED_TEXT,
    SPINE_RING_WIDTH,
    SPINE_VERTICAL_PADDING,
    buildSections,
    chunkRows,
    extractCoverColor,
    fallbackColor,
    pickInk,
    spineLook,
} from '@/lib/spines';
import type { ShelfGroup, ShelfSection } from '@/lib/spines';
import { cn } from '@/lib/utils';
import { bookshelf as moveBook, show } from '@/routes/books';
import {
    destroy as deleteShelf,
    store as createShelf,
    update as renameShelf,
} from '@/routes/bookshelves';
import type { Bookshelf as BookshelfModel, SpineBook } from '@/types';

/** Usable width of the bookcase, to split the spines into rows. */
function useWidth() {
    const ref = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(900);

    useEffect(() => {
        const element = ref.current;

        if (!element) {
            return;
        }

        const observer = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width),
        );
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return [ref, width] as const;
}

/**
 * Flat, graphic bookcase: thickness comes from the pages, color and mark from the title.
 * On the custom shelf books can be dragged between shelves.
 */
export function Bookshelf({
    books,
    group,
    bookshelves,
}: {
    books: SpineBook[];
    group: ShelfGroup;
    bookshelves: BookshelfModel[];
}) {
    const [ref, width] = useWidth();
    const translator = useTranslation();
    const sections = buildSections(books, group, bookshelves, translator);
    const editable = group === 'custom';
    const [dragging, setDragging] = useState<number | null>(null);

    function drop(section: ShelfSection, before: number | null) {
        if (dragging === null || dragging === before) {
            return;
        }

        router.patch(
            moveBook(dragging).url,
            {
                bookshelf_id: section.bookshelfId ?? null,
                before_book_id: before,
            },
            { preserveScroll: true },
        );
        setDragging(null);
    }

    return (
        <div ref={ref} className="flex flex-col gap-9">
            {sections.map((section) => (
                <Section
                    key={section.key}
                    section={section}
                    width={width}
                    editable={editable}
                    dragging={dragging}
                    onDragStart={setDragging}
                    onDrop={(before) => drop(section, before)}
                />
            ))}
            {editable && <NewShelf />}
        </div>
    );
}

function Section({
    section,
    width,
    editable,
    dragging,
    onDragStart,
    onDrop,
}: {
    section: ShelfSection;
    width: number;
    editable: boolean;
    dragging: number | null;
    onDragStart: (id: number | null) => void;
    onDrop: (before: number | null) => void;
}) {
    const { t } = useTranslation();
    const rows = chunkRows(section.books, width - 16);
    const [over, setOver] = useState(false);

    return (
        <section
            aria-label={section.label ?? t('Estante')}
            onDragOver={(event) => {
                if (editable && dragging !== null) {
                    event.preventDefault();
                    setOver(true);
                }
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                onDrop(null);
            }}
            className={cn(
                'flex flex-col gap-3 rounded-md',
                over && 'bg-active',
            )}
        >
            {section.label && (
                <ShelfTitle section={section} editable={editable} />
            )}

            {rows.length === 0 ? (
                <Row>
                    <p className="pb-3 text-xs font-semibold text-faint">
                        {editable ? t('arraste livros para cá') : t('vazia')}
                    </p>
                </Row>
            ) : (
                rows.map((row, index) => (
                    <Row key={index}>
                        {row.map((book) => (
                            <Spine
                                key={book.id}
                                book={book}
                                draggable={editable}
                                onDragStart={() => onDragStart(book.id)}
                                onDragEnd={() => onDragStart(null)}
                                onDropBefore={() => onDrop(book.id)}
                            />
                        ))}
                    </Row>
                ))
            )}
        </section>
    );
}

const SPINE_HOVER_LIFT = 8;

function Row({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="flex items-end gap-1.5 border-b-2 border-strong px-3"
            style={{ minHeight: SPINE_MAX_HEIGHT + SPINE_HOVER_LIFT }}
        >
            {children}
        </div>
    );
}

function Spine({
    book,
    draggable,
    onDragStart,
    onDragEnd,
    onDropBefore,
}: {
    book: SpineBook;
    draggable: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDropBefore: () => void;
}) {
    const { width, height, fontSize } = spineLook(book);
    const [coverColor, setCoverColor] = useState<string | null>(null);
    const color = coverColor ?? fallbackColor(book);

    useEffect(() => {
        let isActive = true;

        if (book.cover_url) {
            void extractCoverColor(book.cover_url).then(
                (found) => isActive && setCoverColor(found),
            );
        }

        return () => {
            isActive = false;
        };
    }, [book.cover_url]);

    const isRecessed =
        book.status === 'want_to_read' || book.status === 'abandoned';
    const isDashed = book.status === 'abandoned';
    const ink = isRecessed ? SPINE_RECESSED_TEXT : pickInk(color);
    const tip = [book.title, book.author].filter(Boolean).join(' — ');

    return (
        <Link
            href={show.url(book.id)}
            title={tip}
            aria-label={tip}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={(event) => draggable && event.preventDefault()}
            onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDropBefore();
            }}
            style={{
                width,
                height,
                paddingBlock: SPINE_VERTICAL_PADDING,
                backgroundColor: isRecessed ? SPINE_RECESSED_BACKGROUND : color,
                color: ink,
            }}
            className="relative flex shrink-0 justify-center overflow-hidden rounded-[2px] transition-transform duration-150 hover:z-10 hover:-translate-y-2 focus-visible:z-10 focus-visible:-translate-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            {isRecessed && (
                <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        border: `${SPINE_RING_WIDTH}px ${isDashed ? 'dashed' : 'solid'} ${color}`,
                    }}
                />
            )}
            {book.status === 'reading' && (
                <span
                    aria-hidden
                    className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 bg-current [clip-path:polygon(0_0,100%_0,50%_100%)]"
                />
            )}
            <span
                className="max-h-full rotate-180 overflow-hidden font-display leading-none font-bold tracking-[-0.04em] whitespace-nowrap uppercase [writing-mode:vertical-rl]"
                style={{ fontSize }}
            >
                {book.title}
            </span>
        </Link>
    );
}

function ShelfTitle({
    section,
    editable,
}: {
    section: ShelfSection;
    editable: boolean;
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(section.label ?? '');

    function save(event: FormEvent) {
        event.preventDefault();
        setEditing(false);

        if (section.bookshelfId && name.trim() && name !== section.label) {
            router.patch(
                renameShelf(section.bookshelfId).url,
                { name },
                { preserveScroll: true },
            );
        }
    }

    return (
        <div className="flex items-baseline gap-2.5 px-3">
            {editing ? (
                <form onSubmit={save}>
                    <input
                        autoFocus
                        value={name}
                        maxLength={60}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={save}
                        className="h-9 rounded-full bg-surface px-4 text-sm font-semibold inset-ring inset-ring-border focus:inset-ring-primary focus:outline-none"
                    />
                </form>
            ) : (
                <h2 className="text-[15px] font-extrabold">{section.label}</h2>
            )}
            <span className="font-mono text-[11px] text-muted">
                {section.books.length}
            </span>
            {editable &&
                section.renamable &&
                section.bookshelfId &&
                !editing && (
                    <>
                        <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="text-xs text-muted hover:text-text"
                        >
                            {t('renomear')}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                router.delete(
                                    deleteShelf(section.bookshelfId as number)
                                        .url,
                                    { preserveScroll: true },
                                )
                            }
                            className="text-xs text-muted hover:text-danger"
                        >
                            {t('apagar')}
                        </button>
                    </>
                )}
        </div>
    );
}

function NewShelf() {
    const { t } = useTranslation();
    const [name, setName] = useState('');

    function submit(event: FormEvent) {
        event.preventDefault();

        if (name.trim()) {
            router.post(
                createShelf.url(),
                { name },
                { preserveScroll: true, onSuccess: () => setName('') },
            );
        }
    }

    return (
        <form onSubmit={submit} className="flex gap-2">
            <Input
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('Nome da nova prateleira')}
                className="w-72"
            />
            <Button type="submit" variant="outline">
                {t('+ Prateleira')}
            </Button>
        </form>
    );
}
