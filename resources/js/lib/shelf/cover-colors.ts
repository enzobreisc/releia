import { hueBin, rgbToHex, saturationAndValue } from './colors';
import type { Rgb } from './colors';

export type CoverColors = {
    /** What the cover looks like at its spine edge, where the spine continues it. */
    ground: string | null;
    /** The most vivid color on the cover, usually the title. */
    accent: string | null;
};

const SAMPLE_WIDTH = 48;
const SAMPLE_HEIGHT = 72;
const EDGE_WIDTH_SHARE = 0.07;
const EDGE_TOP_SHARE = 0.5;
const GROUND_QUANTIZE = 24;
const ACCENT_MIN_SATURATION = 0.55;
const ACCENT_MIN_VALUE = 0.45;
const HUE_BINS = 24;

type Bin = { weight: number; sum: Rgb; count: number };

const extracted = new Map<string, Promise<CoverColors>>();

function pixelAt(data: Uint8ClampedArray, index: number): Rgb {
    return [data[index], data[index + 1], data[index + 2]];
}

function mostCommon(bins: Map<number, Bin>): Rgb | null {
    let best: Bin | null = null;

    for (const bin of bins.values()) {
        if (best === null || bin.weight > best.weight) {
            best = bin;
        }
    }

    return best === null
        ? null
        : (best.sum.map((channel) => channel / best.count) as Rgb);
}

function add(bins: Map<number, Bin>, key: number, rgb: Rgb, weight: number) {
    const bin = bins.get(key) ?? { weight: 0, sum: [0, 0, 0], count: 0 };
    bin.weight += weight;
    bin.count += 1;
    bin.sum = bin.sum.map((channel, index) => channel + rgb[index]) as Rgb;
    bins.set(key, bin);
}

function analyze(data: Uint8ClampedArray): CoverColors {
    const groundBins = new Map<number, Bin>();
    const accentBins = new Map<number, Bin>();
    const edgeColumns = Math.max(
        2,
        Math.round(SAMPLE_WIDTH * EDGE_WIDTH_SHARE),
    );

    for (let y = 0; y < SAMPLE_HEIGHT; y++) {
        for (let x = 0; x < SAMPLE_WIDTH; x++) {
            const rgb = pixelAt(data, (y * SAMPLE_WIDTH + x) * 4);
            const { saturation, value } = saturationAndValue(rgb);

            if (x < edgeColumns && y >= SAMPLE_HEIGHT * EDGE_TOP_SHARE) {
                const [r, g, b] = rgb.map((c) =>
                    Math.floor(c / GROUND_QUANTIZE),
                );
                add(groundBins, (r << 8) | (g << 4) | b, rgb, 1);
            }

            if (
                saturation > ACCENT_MIN_SATURATION &&
                value > ACCENT_MIN_VALUE
            ) {
                add(accentBins, hueBin(rgb, HUE_BINS), rgb, saturation * value);
            }
        }
    }

    const ground = mostCommon(groundBins);
    const accent = mostCommon(accentBins);

    return {
        ground: ground ? rgbToHex(ground) : null,
        accent: accent ? rgbToHex(accent) : null,
    };
}

export function extractCoverColors(src: string): Promise<CoverColors> {
    const cached = extracted.get(src);

    if (cached) {
        return cached;
    }

    const promise = new Promise<CoverColors>((resolve) => {
        const unreadable = { ground: null, accent: null };
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onerror = () => resolve(unreadable);
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = SAMPLE_WIDTH;
                canvas.height = SAMPLE_HEIGHT;
                const context = canvas.getContext('2d', {
                    willReadFrequently: true,
                });

                if (!context) {
                    return resolve(unreadable);
                }

                context.drawImage(image, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
                resolve(
                    analyze(
                        context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
                            .data,
                    ),
                );
            } catch {
                resolve(unreadable);
            }
        };
        image.src = src;
    });

    extracted.set(src, promise);

    return promise;
}
