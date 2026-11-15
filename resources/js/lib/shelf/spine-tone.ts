export type SpineTone = {
    ground: string;
    edge: string;
    mark: string;
};

const NEUTRAL: SpineTone = {
    ground: 'var(--color-elevated)',
    edge: 'var(--color-strong)',
    mark: 'var(--color-muted)',
};

/** One hue at fixed lightness and chroma, so every publisher sits at the same depth on the night ground. */
export function spineTone(hue: number | null): SpineTone {
    if (hue === null) {
        return NEUTRAL;
    }

    return {
        ground: `oklch(0.25 0.045 ${hue})`,
        edge: `oklch(0.37 0.06 ${hue})`,
        mark: `oklch(0.8 0.1 ${hue})`,
    };
}
