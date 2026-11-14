import { SPINE_GAP } from '@/lib/shelf/layout';

const BOOKEND_WIDTH = 8;
const BOOKEND_HEIGHT = 132;
const FOOT_WIDTH = 38;
const FOOT_HEIGHT = 5;
const FOOT_OVERHANG = 30;

export function Bookend({ scale }: { scale: number }) {
    const px = (value: number) => Math.round(value * scale);

    return (
        <div
            aria-hidden
            className="relative isolate shrink-0"
            style={{
                width: px(BOOKEND_WIDTH),
                height: px(BOOKEND_HEIGHT),
                marginLeft: SPINE_GAP,
            }}
        >
            <span
                className="absolute bottom-0 -z-10 rounded-[1px]"
                style={{
                    left: -px(FOOT_OVERHANG),
                    width: px(FOOT_WIDTH),
                    height: px(FOOT_HEIGHT),
                    background: 'linear-gradient(180deg,#566070,#232832)',
                }}
            />
            <span
                className="absolute inset-0 rounded-t-[2px]"
                style={{
                    background:
                        'linear-gradient(90deg,#5b6372,#2c313c 55%,#171a21)',
                    boxShadow: '2px 0 4px rgba(0,0,0,.5)',
                }}
            />
        </div>
    );
}
