import { Link } from '@inertiajs/react';
import { useSpineColors } from '@/hooks/use-spine-colors';
import { withAlpha } from '@/lib/shelf/colors';
import { identityFor } from '@/lib/shelf/publisher-identity';
import { FACE_FAMILIES } from '@/lib/shelf/spine-type';
import { show } from '@/routes/books';
import type { SpineBook } from '@/types';

const STACK_WIDTH = 176;
const STACK_MARGIN = 26;
const FLAT_BASE_WIDTH = 150;
const FLAT_BASE_HEIGHT = 30;
const WIDTH_STEP = 6;
const HEIGHT_STEP = 3;
const OFFSETS = [0, 9, -5];
const BAND_ALPHA = 0.38;
const LABEL_FONT_SIZE = 10;
const MIN_LABEL_FONT_SIZE = 8;
const END_INSET = 12;
const LABEL_INSET = 24;

function FlatBook({
    book,
    index,
    scale,
}: {
    book: SpineBook;
    index: number;
    scale: number;
}) {
    const colors = useSpineColors(book);
    const identity = identityFor(book.publisher_key);
    const px = (value: number) => Math.round(value * scale);
    const pages = book.pages ?? 0;
    const band = withAlpha(colors.ink, BAND_ALPHA);
    const bandStyle = {
        top: 0,
        bottom: 0,
        width: Math.max(2, px(4)),
        borderLeft: `1px solid ${band}`,
        borderRight: `1px solid ${band}`,
    };
    const tip = [book.title, book.author, book.publisher]
        .filter(Boolean)
        .join(' — ');

    return (
        <Link
            href={show.url(book.id)}
            title={tip}
            aria-label={tip}
            style={{
                width: px(FLAT_BASE_WIDTH + (pages % 5) * WIDTH_STEP),
                height: px(FLAT_BASE_HEIGHT + (pages % 3) * HEIGHT_STEP),
                marginLeft: px(OFFSETS[index % OFFSETS.length]),
                backgroundColor: colors.ground,
                backgroundImage:
                    'linear-gradient(180deg, rgba(255,255,255,.13) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,.40) 100%)',
                color: colors.ink,
                boxShadow:
                    '0 2px 3px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12)',
            }}
            className="relative block rounded-[2px] transition-[translate] duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            <span
                aria-hidden
                className="absolute"
                style={{ ...bandStyle, left: px(END_INSET) }}
            />
            <span
                className="absolute flex items-center justify-center overflow-hidden font-bold text-ellipsis whitespace-nowrap"
                style={{
                    inset: `0 ${px(LABEL_INSET)}px`,
                    color: colors.titleColor,
                    fontFamily: FACE_FAMILIES[identity.face],
                    fontSize: Math.max(
                        MIN_LABEL_FONT_SIZE,
                        px(LABEL_FONT_SIZE),
                    ),
                    textTransform:
                        identity.face === 'serif' ? 'none' : 'uppercase',
                }}
            >
                {book.title}
            </span>
            <span
                aria-hidden
                className="absolute"
                style={{ ...bandStyle, right: px(END_INSET) }}
            />
        </Link>
    );
}

/** The last books of the shelf lie flat, as they would when there is room left over. */
export function FlatStack({
    books,
    scale,
}: {
    books: SpineBook[];
    scale: number;
}) {
    return (
        <div
            className="flex shrink-0 flex-col-reverse"
            style={{
                marginLeft: Math.round(STACK_MARGIN * scale),
                width: Math.round(STACK_WIDTH * scale),
            }}
        >
            {books.map((book, index) => (
                <FlatBook
                    key={book.id}
                    book={book}
                    index={index}
                    scale={scale}
                />
            ))}
        </div>
    );
}
