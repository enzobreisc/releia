import type { ReactNode } from 'react';
import { SHELF_BOOK_MAX_HEIGHT } from '@/lib/shelf/spine-size';

const SIDE = 22;
const PADDING = 14;
const CORNICE = 30;
const BOARD = 18;
const PLINTH = 34;
const HEADROOM = 22;
const CORNICE_OVERHANG = 8;
const PLINTH_OVERHANG = 4;

export function cabinetMetrics(scale: number) {
    const px = (value: number) => Math.round(value * scale);

    return {
        side: px(SIDE),
        padding: px(PADDING),
        compartment: px(SHELF_BOOK_MAX_HEIGHT + HEADROOM),
        cornice: px(CORNICE),
        board: px(BOARD),
        plinth: px(PLINTH),
        corniceOverhang: px(CORNICE_OVERHANG),
        plinthOverhang: px(PLINTH_OVERHANG),
    };
}

const SIDE_PANEL =
    'repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 2px,rgba(0,0,0,0) 2px 13px), linear-gradient(90deg,#08090a 0%,#1d1e22 28%,#15161a 72%,#070708 100%)';
const COMPARTMENT_BACK =
    'linear-gradient(180deg,rgba(0,0,0,0) 80%,rgba(0,0,0,.5) 100%), linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,0) 8%,rgba(0,0,0,0) 92%,rgba(0,0,0,.5)), repeating-linear-gradient(90deg,rgba(255,255,255,.012) 0 2px,rgba(0,0,0,0) 2px 9px), radial-gradient(120% 100% at 50% 15%,#101113 0%,#050506 100%)';

export function Cabinet({
    scale,
    children,
}: {
    scale: number;
    children: ReactNode;
}) {
    const metrics = cabinetMetrics(scale);

    return (
        <div className="relative">
            <div
                className="relative z-20 rounded-t-[3px]"
                style={{
                    height: metrics.cornice,
                    margin: `0 -${metrics.corniceOverhang}px`,
                    backgroundColor: '#17181b',
                    backgroundImage:
                        'linear-gradient(180deg,rgba(255,255,255,.10) 0,rgba(255,255,255,0) 14%,rgba(0,0,0,0) 70%,rgba(0,0,0,.45) 100%)',
                    boxShadow: '0 6px 12px -4px rgba(0,0,0,.7)',
                }}
            />
            <div className="flex">
                <div
                    className="shrink-0"
                    style={{
                        width: metrics.side,
                        backgroundColor: '#121316',
                        backgroundImage: SIDE_PANEL,
                    }}
                />
                <div className="flex min-w-0 flex-1 flex-col bg-[#050506]">
                    {children}
                </div>
                <div
                    className="shrink-0"
                    style={{
                        width: metrics.side,
                        backgroundColor: '#121316',
                        backgroundImage: SIDE_PANEL,
                    }}
                />
            </div>
            <div
                className="rounded-b-[2px]"
                style={{
                    height: metrics.plinth,
                    margin: `0 -${metrics.plinthOverhang}px`,
                    backgroundColor: '#0e0f11',
                    backgroundImage:
                        'linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,0) 30%)',
                    boxShadow: `0 ${Math.round(metrics.plinth * 1.35)}px ${Math.round(metrics.plinth * 1.75)}px -${Math.round(metrics.plinth * 0.7)}px rgba(0,0,0,.95)`,
                }}
            />
        </div>
    );
}

export function Compartment({
    scale,
    children,
}: {
    scale: number;
    children?: ReactNode;
}) {
    const metrics = cabinetMetrics(scale);

    return (
        <>
            <div
                className="relative flex items-end"
                style={{
                    height: metrics.compartment,
                    paddingInline: metrics.padding,
                    backgroundImage: COMPARTMENT_BACK,
                    boxShadow: `inset 0 ${Math.round(metrics.compartment * 0.1)}px ${Math.round(metrics.compartment * 0.1)}px -${Math.round(metrics.compartment * 0.06)}px rgba(0,0,0,.9)`,
                }}
            >
                {children}
            </div>
            <div
                className="relative z-10"
                style={{
                    height: metrics.board,
                    backgroundColor: '#1a1b1f',
                    backgroundImage:
                        'linear-gradient(180deg,rgba(255,255,255,.12) 0,rgba(255,255,255,.12) 1px,rgba(0,0,0,0) 1px,rgba(0,0,0,0) 78%,rgba(0,0,0,.38) 100%)',
                    boxShadow: `0 ${Math.round(metrics.board * 0.67)}px ${Math.round(metrics.board * 0.78)}px -${Math.round(metrics.board * 0.33)}px rgba(0,0,0,.75)`,
                }}
            />
        </>
    );
}
