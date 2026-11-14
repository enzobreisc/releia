import type { CSSProperties } from 'react';
import { withAlpha } from './colors';
import type { SpineDevice } from './publisher-identity';

export type DeviceMarks = {
    top: CSSProperties | null;
    bottom: CSSProperties | null;
};

type Palette = { ink: string; accent: string | null };

const THIN_ALPHA = 0.38;
const FALLBACK_MARK_ALPHA = 0.55;
const MIN_SQUARE = 7;
const MAX_SQUARE = 12;
const SQUARE_WIDTH_SHARE = 0.3;
const STRIPE_PATTERN =
    'repeating-linear-gradient(180deg, COLOR 0 1px, rgba(0,0,0,0) 1px 4px)';

type Scaler = (value: number) => number;

/** Each publisher repeats one device on all its spines: the family resemblance on the shelf. */
export function deviceMarks(
    device: SpineDevice,
    { ink, accent }: Palette,
    spineWidth: number,
    px: Scaler,
): DeviceMarks {
    const thin = withAlpha(ink, THIN_ALPHA);
    const mark = accent ?? withAlpha(ink, FALLBACK_MARK_ALPHA);

    const line = (edge: 'top' | 'bottom', offset: number): CSSProperties => ({
        position: 'absolute',
        left: 0,
        right: 0,
        [edge]: px(offset),
        height: 0,
        borderTop: `1px solid ${thin}`,
    });
    const double = (edge: 'top' | 'bottom', offset: number): CSSProperties => ({
        position: 'absolute',
        left: 0,
        right: 0,
        [edge]: px(offset),
        height: Math.max(2, px(4)),
        borderTop: `1px solid ${thin}`,
        borderBottom: `1px solid ${thin}`,
    });
    const block = (
        edge: 'top' | 'bottom',
        offset: number,
        height: number,
        color: string,
    ): CSSProperties => ({
        position: 'absolute',
        left: 0,
        right: 0,
        [edge]: px(offset),
        height: px(height),
        background: color,
    });

    switch (device) {
        case 'heavy':
            return {
                top: block('top', 14, 6, thin),
                bottom: block('bottom', 10, 6, mark),
            };
        case 'label':
            return {
                top: {
                    position: 'absolute',
                    boxSizing: 'border-box',
                    left: px(4),
                    right: px(4),
                    top: px(14),
                    height: px(14),
                    border: `1px solid ${thin}`,
                },
                bottom: line('bottom', 12),
            };
        case 'square': {
            const size = Math.max(
                px(MIN_SQUARE),
                Math.min(
                    px(MAX_SQUARE),
                    Math.round(spineWidth * SQUARE_WIDTH_SHARE),
                ),
            );

            return {
                top: line('top', 16),
                bottom: {
                    position: 'absolute',
                    left: '50%',
                    marginLeft: -Math.round(size / 2),
                    bottom: px(14),
                    width: size,
                    height: size,
                    background: mark,
                },
            };
        }
        case 'triple':
            return {
                top: {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: px(14),
                    height: px(9),
                    backgroundImage: STRIPE_PATTERN.replace('COLOR', thin),
                },
                bottom: line('bottom', 10),
            };
        case 'base':
            return { top: null, bottom: block('bottom', 8, 16, mark) };
        case 'double':
            return { top: double('top', 16), bottom: double('bottom', 10) };
    }
}
