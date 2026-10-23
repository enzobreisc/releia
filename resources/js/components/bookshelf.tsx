import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input } from '@/components/form';
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

function Row({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-[230px] items-end gap-1 rounded-xs border-b-[6px] px-3">
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
            className="group relative flex shrink-0 origin-bottom flex-col items-center justify-between gap-1 overflow-hidden rounded-t-[3px] pb-1.5 inset-shadow-2xs inset-shadow-white/10 transition-transform duration-150 hover:z-10 hover:-translate-y-2"
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
                        className="aspect-[2/3] w-[calc(100%-8px)] rounded-[2px] object-cover"
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
