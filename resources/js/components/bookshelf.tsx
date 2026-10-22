import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import {
    buildSections,
    chunkRows,
    extractColors,
    spineColors,
    spineSize,
} from '@/lib/spines';
import type { SpineColors } from '@/lib/spines';
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
 * Bookcase of spines: thickness comes from the pages, color from the cover (or the title
 * until it loads). On the custom shelf books can be dragged between shelves.
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
        <div ref={ref} className="flex flex-col gap-8">
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
                'flex flex-col gap-2 rounded-md',
                over && 'bg-active',
            )}
        >
            {section.label && (
                <ShelfTitle section={section} editable={editable} />
            )}

            {rows.length === 0 ? (
                <Row>
                    <p className="pb-3 font-mono text-xs text-faint">
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

/** A row of spines resting on a board. */
function Row({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col">
            <div className="flex min-h-[188px] items-end gap-[3px] px-2">
                {children}
            </div>
            <div className="h-3 rounded-b-[3px] border-x border-t-2 border-b border-t-strong bg-elevated shadow-[0_6px_10px_-4px_rgba(0,0,0,0.6)]" />
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
    const [colors, setColors] = useState<SpineColors>(() => spineColors(book));
    const { bg, fg, accent } = colors;
    const { width, height } = spineSize(book);
    const tip = [book.title, book.author].filter(Boolean).join(' — ');

    // The color comes from the cover; until the image is read (or without a cover) the provisional title color applies.
    useEffect(() => {
        let active = true;

        if (book.cover_url) {
            void extractColors(book.cover_url).then(
                (found) => active && found && setColors(found),
            );
        }

        return () => {
            active = false;
        };
    }, [book.cover_url]);

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
            style={{ width, height, backgroundColor: bg, color: fg }}
            className="group relative flex shrink-0 origin-bottom flex-col items-center justify-between gap-1 overflow-hidden rounded-t-[3px] pb-1.5 shadow-[inset_-3px_0_4px_-2px_rgba(0,0,0,0.35),inset_2px_0_2px_-1px_rgba(255,255,255,0.12)] transition-transform duration-150 hover:z-10 hover:-translate-y-2"
        >
            <span
                aria-hidden
                className="h-1.5 w-full"
                style={{ backgroundColor: accent, opacity: 0.85 }}
            />
            <span className="flex min-h-0 flex-1 items-center gap-1 overflow-hidden py-1.5 [writing-mode:vertical-rl]">
                <span className="max-h-full overflow-hidden text-[12px] leading-tight font-bold text-ellipsis whitespace-nowrap">
                    {book.title}
                </span>
                {width >= 36 && book.author && (
                    <span className="max-h-full overflow-hidden text-[10px] leading-tight text-ellipsis whitespace-nowrap opacity-70">
                        {book.author}
                    </span>
                )}
            </span>
            <span className="relative flex w-full flex-col items-center gap-1">
                {book.status === 'reading' && (
                    <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-current"
                    />
                )}
                {book.cover_url && width >= 30 ? (
                    // Cover thumbnail at the foot of the spine: it is what makes the book recognizable.
                    <img
                        src={book.cover_url}
                        alt=""
                        loading="lazy"
                        className="aspect-[2/3] w-[calc(100%-8px)] rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                    />
                ) : (
                    <span
                        aria-hidden
                        className="h-1.5 w-full"
                        style={{ backgroundColor: accent, opacity: 0.85 }}
                    />
                )}
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
        <div className="flex items-center gap-3 px-2">
            {editing ? (
                <form onSubmit={save}>
                    <input
                        autoFocus
                        value={name}
                        maxLength={60}
                        onChange={(event) => setName(event.target.value)}
                        onBlur={save}
                        className="h-8 rounded-sm border bg-surface px-2 font-mono text-sm"
                    />
                </form>
            ) : (
                <h2 className="font-mono text-sm font-semibold text-nav">
                    {section.label}
                </h2>
            )}
            <span className="font-mono text-xs text-faint">
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
                            className="text-xs text-muted hover:text-red-300"
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
            <input
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('Nome da nova prateleira')}
                className="h-10 w-72 rounded-sm border bg-surface px-3 text-sm placeholder:text-muted"
            />
            <button
                type="submit"
                className="h-10 rounded-sm border border-primary bg-surface px-4 text-sm font-semibold text-accent hover:bg-active"
            >
                {t('+ Prateleira')}
            </button>
        </form>
    );
}
