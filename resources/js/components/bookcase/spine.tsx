import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { RotateBookIcon } from '@/components/icons';
import { PublisherMark } from '@/components/bookcase/publisher-mark';
import { StatusMark } from '@/components/bookcase/status-mark';
import { useTranslation } from '@/hooks/use-translation';
import { SPINE_GAP } from '@/lib/shelf/layout';
import { identityFor } from '@/lib/shelf/publisher-identity';
import { spineSize } from '@/lib/shelf/spine-size';
import { spineTone } from '@/lib/shelf/spine-tone';
import { cn } from '@/lib/utils';
import { show } from '@/routes/books';
import type { SpineBook } from '@/types';

/** The edition's cover, blurred and dimmed: the spine keeps its colors without competing with the text. */
function CoverWash({ coverUrl }: { coverUrl: string }) {
    return (
        <>
            <span
                aria-hidden
                className="absolute inset-0 -z-20 scale-125 bg-cover bg-center blur-xs saturate-150"
                style={{ backgroundImage: `url(${coverUrl})` }}
            />
            <span
                aria-hidden
                className="absolute inset-0 -z-20 bg-linear-to-b from-bg/45 to-bg/75"
            />
        </>
    );
}

export type SpineDrag = {
    onStart: () => void;
    onEnd: () => void;
    onDropBefore: () => void;
};

export function Spine({
    book,
    scale,
    drag,
    onTogglePosture,
}: {
    book: SpineBook;
    scale: number;
    /** Without it the spine cannot be dragged or dropped on. */
    drag?: SpineDrag;
    /** Without it the book cannot be laid down or stood up. */
    onTogglePosture?: () => void;
}) {
    const { t } = useTranslation();
    const [isDropTarget, setIsDropTarget] = useState(false);
    const identity = identityFor(book.publisher_key);
    const tone = spineTone(identity.hue);
    const { width, height } = spineSize(book, scale);
    const tip = [book.title, book.author, book.publisher]
        .filter(Boolean)
        .join(' — ');

    return (
        <div
            className="group/spine relative shrink-0"
            style={{ width, height, marginRight: SPINE_GAP }}
        >
            <Link
                href={show.url(book.id)}
                title={tip}
                aria-label={tip}
                draggable={drag !== undefined}
                onDragStart={drag?.onStart}
                onDragEnd={drag?.onEnd}
                onDragOver={(event) => {
                    if (drag) {
                        event.preventDefault();
                        setIsDropTarget(true);
                    }
                }}
                onDragLeave={() => setIsDropTarget(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsDropTarget(false);
                    drag?.onDropBefore();
                }}
                style={{ backgroundColor: tone.ground, color: tone.mark }}
                className={cn(
                    'relative isolate flex size-full items-center overflow-hidden rounded-cover transition-[translate] duration-150 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 motion-reduce:transition-none',
                    book.is_lying_down
                        ? 'flex-row gap-2.5 px-3'
                        : 'flex-col gap-2.5 py-3',
                    isDropTarget && 'outline-2 outline-offset-1 outline-accent',
                )}
            >
                {book.cover_url && <CoverWash coverUrl={book.cover_url} />}
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -z-10 rounded-cover"
                    style={{ boxShadow: `inset 0 0 0 1px ${tone.edge}` }}
                />
                <span
                    className={cn(
                        book.is_lying_down ? 'w-6 shrink-0' : 'w-full',
                    )}
                >
                    <PublisherMark device={identity.device} />
                </span>
                <span
                    className={cn(
                        'min-h-0 font-sans text-[13px] leading-[1.2] font-bold text-text',
                        'line-clamp-2 flex-1',
                        book.is_lying_down && 'min-w-0',
                    )}
                    style={
                        book.is_lying_down
                            ? undefined
                            : { writingMode: 'vertical-rl' }
                    }
                >
                    {book.title}
                </span>
                {book.author_surname !== '' && (
                    <span
                        className={cn(
                            'shrink-0 overflow-hidden font-mono text-[10px] tracking-wide text-ellipsis whitespace-nowrap uppercase',
                            book.is_lying_down ? 'max-w-20' : 'max-h-16',
                            book.cover_url && 'text-text/75',
                        )}
                        style={
                            book.is_lying_down
                                ? undefined
                                : { writingMode: 'vertical-rl' }
                        }
                    >
                        {book.author_surname}
                    </span>
                )}
                <StatusMark status={book.status} />
            </Link>
            {onTogglePosture && (
                <button
                    type="button"
                    onClick={onTogglePosture}
                    aria-label={
                        book.is_lying_down
                            ? t('Colocar em pé')
                            : t('Deitar o livro')
                    }
                    title={
                        book.is_lying_down
                            ? t('Colocar em pé')
                            : t('Deitar o livro')
                    }
                    className="absolute top-1 right-1 z-10 inline-flex size-6 items-center justify-center rounded-full bg-elevated text-secondary opacity-0 shadow-float transition-opacity group-focus-within/spine:opacity-100 group-hover/spine:opacity-100 hover:text-text focus-visible:opacity-100 motion-reduce:transition-none"
                >
                    <RotateBookIcon width={12} height={12} />
                </button>
            )}
        </div>
    );
}
