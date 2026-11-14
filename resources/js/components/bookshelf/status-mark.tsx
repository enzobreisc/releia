import type { CSSProperties } from 'react';

type Status = string | null;

const MARK_SIZE = 10;
const RING_SIZE = 8;
const DASH_WIDTH = 12;

function markStyle(
    status: Status,
    px: (value: number) => number,
): CSSProperties | null {
    switch (status) {
        case 'reading':
            return {
                top: 0,
                width: px(MARK_SIZE),
                height: px(MARK_SIZE),
                marginLeft: -px(MARK_SIZE) / 2,
                background: 'currentColor',
                clipPath: 'polygon(0 0,100% 0,50% 100%)',
            };
        case 'want_to_read':
            return {
                top: px(5),
                boxSizing: 'border-box',
                width: px(RING_SIZE),
                height: px(RING_SIZE),
                marginLeft: -px(RING_SIZE) / 2,
                border: '1.5px solid currentColor',
                borderRadius: '50%',
            };
        case 'abandoned':
            return {
                top: px(8),
                width: px(DASH_WIDTH),
                height: 2,
                marginLeft: -px(DASH_WIDTH) / 2,
                background: 'currentColor',
            };
        default:
            return null;
    }
}

/** Triangle: reading. Ring: want to read. Dash: abandoned. Read books carry none. */
export function StatusMark({
    status,
    px,
}: {
    status: Status;
    px: (value: number) => number;
}) {
    const style = markStyle(status, px);

    return style === null ? null : (
        <span aria-hidden className="absolute left-1/2" style={style} />
    );
}
