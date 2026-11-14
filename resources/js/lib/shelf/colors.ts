export type Rgb = [number, number, number];

export const INK_LIGHT = '#f4f1ea';
export const INK_DARK = '#0b0d12';

const HEX_CHANNEL_STARTS = [1, 3, 5];
const READABLE_CONTRAST = 3.2;
const READABLE_STEP = 0.16;
const READABLE_MAX_STEPS = 10;
const LIGHT_GROUND_MIN_VALUE = 0.8;
const LIGHT_GROUND_MAX_SATURATION = 0.15;
const LIGHT_GROUND_SOFTENING: Rgb = [0.91, 0.9, 0.86];
const GROUND_LIGHTNESS_RANGE = { min: 0.075, max: 0.84 };
const ACCENT_GROUND_LIGHTNESS_RANGE = { min: 0.22, max: 0.45 };
const ACCENT_GROUND_MAX_SATURATION = 0.7;

export function hexToRgb(hex: string): Rgb {
    return HEX_CHANNEL_STARTS.map((start) =>
        parseInt(hex.slice(start, start + 2), 16),
    ) as Rgb;
}

export function rgbToHex(rgb: Rgb): string {
    return `#${rgb
        .map((channel) =>
            Math.round(Math.min(255, Math.max(0, channel)))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;
}

export function withAlpha(hex: string, alpha: number): string {
    const [red, green, blue] = hexToRgb(hex);

    return `rgba(${red},${green},${blue},${alpha})`;
}

function channelLuminance(value: number): number {
    const unit = value / 255;

    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
    const [red, green, blue] = hexToRgb(hex).map(channelLuminance);

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string): number {
    const [lighter, darker] = [luminance(first), luminance(second)].sort(
        (a, b) => b - a,
    );

    return (lighter + 0.05) / (darker + 0.05);
}

export function pickInk(background: string): string {
    return contrastRatio(background, INK_DARK) >=
        contrastRatio(background, INK_LIGHT)
        ? INK_DARK
        : INK_LIGHT;
}

export function isLight(hex: string): boolean {
    return luminance(hex) > 0.4;
}

type Hsl = { hue: number; saturation: number; lightness: number };

function rgbToHsl([red, green, blue]: Rgb): Hsl {
    const [r, g, b] = [red / 255, green / 255, blue / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;

    if (max === min) {
        return { hue: 0, saturation: 0, lightness };
    }

    const delta = max - min;
    const saturation =
        lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    const hue =
        max === r
            ? (g - b) / delta + (g < b ? 6 : 0)
            : max === g
              ? (b - r) / delta + 2
              : (r - g) / delta + 4;

    return { hue: hue / 6, saturation, lightness };
}

function hueToChannel(p: number, q: number, shifted: number): number {
    const t = (shifted + 1) % 1;

    if (t < 1 / 6) {
        return p + (q - p) * 6 * t;
    }

    if (t < 1 / 2) {
        return q;
    }

    return t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
}

function hslToRgb({ hue, saturation, lightness }: Hsl): Rgb {
    if (saturation === 0) {
        const gray = lightness * 255;

        return [gray, gray, gray];
    }

    const q =
        lightness < 0.5
            ? lightness * (1 + saturation)
            : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;

    return [
        hueToChannel(p, q, hue + 1 / 3) * 255,
        hueToChannel(p, q, hue) * 255,
        hueToChannel(p, q, hue - 1 / 3) * 255,
    ];
}

/** HSV saturation and value, 0–1. */
export function saturationAndValue([red, green, blue]: Rgb): {
    saturation: number;
    value: number;
} {
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);

    return { saturation: max === 0 ? 0 : (max - min) / max, value: max / 255 };
}

export function hueBin(rgb: Rgb, bins: number): number {
    return Math.min(bins - 1, Math.floor(rgbToHsl(rgb).hue * bins));
}

function clampLightness(
    hex: string,
    range: { min: number; max: number },
    maxSaturation = 1,
): string {
    const hsl = rgbToHsl(hexToRgb(hex));

    return rgbToHex(
        hslToRgb({
            ...hsl,
            saturation: Math.min(hsl.saturation, maxSaturation),
            lightness: Math.min(range.max, Math.max(range.min, hsl.lightness)),
        }),
    );
}

/** A cover ground that is pure white would glare on a dark shelf, so near-white is softened. */
export function toneGround(hex: string): string {
    const rgb = hexToRgb(hex);
    const { saturation, value } = saturationAndValue(rgb);

    if (
        value > LIGHT_GROUND_MIN_VALUE &&
        saturation < LIGHT_GROUND_MAX_SATURATION
    ) {
        return rgbToHex(
            rgb.map(
                (channel, index) => channel * LIGHT_GROUND_SOFTENING[index],
            ) as Rgb,
        );
    }

    return clampLightness(hex, GROUND_LIGHTNESS_RANGE);
}

/** A title color promoted to the spine ground: bright covers are pulled into a range that sits well on the shelf. */
export function toneAccentAsGround(hex: string): string {
    return clampLightness(
        hex,
        ACCENT_GROUND_LIGHTNESS_RANGE,
        ACCENT_GROUND_MAX_SATURATION,
    );
}

/** The color nudged toward the opposite end until it can be read on the ground. */
export function readableOn(
    color: string | null,
    ground: string,
    fallback: string,
): string {
    if (color === null) {
        return fallback;
    }

    const target = isLight(ground) ? 0 : 255;
    let current = hexToRgb(color);

    for (let step = 0; step < READABLE_MAX_STEPS; step++) {
        const candidate = rgbToHex(current);

        if (contrastRatio(candidate, ground) >= READABLE_CONTRAST) {
            return candidate;
        }

        current = current.map(
            (channel) => channel + (target - channel) * READABLE_STEP,
        ) as Rgb;
    }

    return fallback;
}
