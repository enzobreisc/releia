import { Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import { StatusMark } from '@/components/bookshelf/status-mark';
import { useSpineColors } from '@/hooks/use-spine-colors';
import {
    LEAN_LEFT_DEGREES,
    LEAN_RIGHT_DEGREES,
    SPINE_GAP,
} from '@/lib/shelf/layout';
import type { Tilt } from '@/lib/shelf/layout';
import { identityFor } from '@/lib/shelf/publisher-identity';
import { deviceMarks } from '@/lib/shelf/spine-marks';
import { spineSize } from '@/lib/shelf/spine-size';
import { FACE_FAMILIES, titleFontSize } from '@/lib/shelf/spine-type';
import { show } from '@/routes/books';
import type { SpineBook } from '@/types';

const TOP_INSET = 34;
const AUTHOR_HEIGHT = 72;
const AUTHOR_GAP = 8;
const BOTTOM_INSET = 36;
const MIN_AUTHOR_SPINE_WIDTH = 32;
const MIN_TITLE_LENGTH = 40;
const AUTHOR_FONT_SIZE = 8.5;
const MIN_AUTHOR_FONT_SIZE = 8;

const SHEEN =
    'linear-gradient(90deg, rgba(0,0,0,.42) 0%, rgba(255,255,255,.10) 14%, rgba(255,255,255,0) 34%, rgba(0,0,0,.10) 72%, rgba(0,0,0,.46) 100%)';

const VERTICAL_TEXT: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    writingMode: 'vertical-rl',
    textAlign: 'start',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
};

function tiltStyle(tilt: Tilt, leanOffset: number): CSSProperties {
    if (tilt === 'left') {
        return {
            marginLeft: leanOffset,
            transform: `rotate(-${LEAN_LEFT_DEGREES}deg)`,
            transformOrigin: 'bottom left',
        };
    }

    if (tilt === 'right') {
        return {
            transform: `rotate(${LEAN_RIGHT_DEGREES}deg)`,
            transformOrigin: 'bottom right',
        };
    }

    return {};
}

export function Spine({
    book,
    scale,
    tilt,
    leanOffset,
    isDraggable,
    onDragStart,
    onDragEnd,
    onDropBefore,
}: {
    book: SpineBook;
    scale: number;
    tilt: Tilt;
    leanOffset: number;
    isDraggable: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDropBefore: () => void;
}) {
    const colors = useSpineColors(book);
    const identity = identityFor(book.publisher_key);
    const { width, height } = spineSize(book, scale);
    const px = (value: number) => Math.round(value * scale);
    const marks = deviceMarks(
        identity.device,
        { ink: colors.ink, accent: colors.accent },
        width,
        px,
    );
    const hasAuthor =
        book.author_surname !== '' && width >= px(MIN_AUTHOR_SPINE_WIDTH);
    const authorHeight = hasAuthor ? px(AUTHOR_HEIGHT) : 0;
    const titleTop =
        px(TOP_INSET) + authorHeight + (hasAuthor ? px(AUTHOR_GAP) : 0);
    const titleBottom = px(BOTTOM_INSET);
    const fontSize = titleFontSize(
        book.title,
        width,
        Math.max(px(MIN_TITLE_LENGTH), height - titleTop - titleBottom),
        identity.face,
    );
    const isSerif = identity.face === 'serif';
    const tip = [book.title, book.author, book.publisher]
        .filter(Boolean)
        .join(' — ');

    return (
        <Link
            href={show.url(book.id)}
            title={tip}
            aria-label={tip}
            draggable={isDraggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={(event) => isDraggable && event.preventDefault()}
            onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDropBefore();
            }}
            style={{
                width,
                height,
                marginRight: SPINE_GAP,
                backgroundColor: colors.ground,
                backgroundImage: SHEEN,
                color: colors.ink,
                boxShadow:
                    '2px 0 4px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.10)',
                ...tiltStyle(tilt, leanOffset),
            }}
            className="relative box-border shrink-0 rounded-t-[2px] rounded-b-[1px] transition-[translate] duration-150 hover:z-10 hover:-translate-y-2 focus-visible:z-10 focus-visible:-translate-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            <StatusMark status={book.status} px={px} />
            {marks.top && <span aria-hidden style={marks.top} />}
            {hasAuthor && (
                <span
                    style={{
                        ...VERTICAL_TEXT,
                        top: px(TOP_INSET),
                        height: authorHeight,
                        fontFamily: FACE_FAMILIES.sans,
                        fontSize: Math.max(
                            MIN_AUTHOR_FONT_SIZE,
                            px(AUTHOR_FONT_SIZE),
                        ),
                        fontWeight: 600,
                        lineHeight: `${width}px`,
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        opacity: 0.85,
                    }}
                >
                    {book.author_surname}
                </span>
            )}
            <span
                style={{
                    ...VERTICAL_TEXT,
                    top: titleTop,
                    bottom: titleBottom,
                    color: colors.titleColor,
                    fontFamily: FACE_FAMILIES[identity.face],
                    fontSize,
                    fontWeight: 700,
                    lineHeight: `${width}px`,
                    textTransform: isSerif ? 'none' : 'uppercase',
                    letterSpacing: isSerif ? 0 : '-0.02em',
                }}
            >
                {book.title}
            </span>
            {marks.bottom && <span aria-hidden style={marks.bottom} />}
        </Link>
    );
}
