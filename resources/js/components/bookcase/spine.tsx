import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { PublisherMark } from '@/components/bookcase/publisher-mark';
import { StatusMark } from '@/components/bookcase/status-mark';
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
}: {
    book: SpineBook;
    scale: number;
    /** Without it the spine cannot be dragged or dropped on. */
    drag?: SpineDrag;
}) {
    const [isDropTarget, setIsDropTarget] = useState(false);
    const identity = identityFor(book.publisher_key);
    const tone = spineTone(identity.hue);
    const { width, height } = spineSize(book, scale);
    const tip = [book.title, book.author, book.publisher]
        .filter(Boolean)
        .join(' — ');

    return (
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
            style={{
                width,
                height,
                marginRight: SPINE_GAP,
                backgroundColor: tone.ground,
                color: tone.mark,
            }}
            className={cn(
                'relative isolate flex shrink-0 flex-col items-center gap-2.5 overflow-hidden rounded-cover py-3 transition-[translate] duration-150 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 motion-reduce:transition-none',
                isDropTarget && 'outline-2 outline-offset-1 outline-accent',
            )}
        >
            {book.cover_url && <CoverWash coverUrl={book.cover_url} />}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 rounded-cover"
                style={{ boxShadow: `inset 0 0 0 1px ${tone.edge}` }}
            />
            <PublisherMark device={identity.device} />
            <span
                className="line-clamp-2 min-h-0 flex-1 font-sans text-[13px] leading-[1.2] font-bold text-text"
                style={{ writingMode: 'vertical-rl' }}
            >
                {book.title}
            </span>
            {book.author_surname !== '' && (
                <span
                    className={cn(
                        'max-h-16 shrink-0 overflow-hidden font-mono text-[10px] tracking-wide text-ellipsis whitespace-nowrap uppercase',
                        book.cover_url && 'text-text/75',
                    )}
                    style={{ writingMode: 'vertical-rl' }}
                >
                    {book.author_surname}
                </span>
            )}
            <StatusMark status={book.status} />
        </Link>
    );
}
