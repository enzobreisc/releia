import type { TitleFace } from './publisher-identity';

const FONT_RATIO = 0.3;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 16;
const SERIF_BONUS = 2;
const MIN_FITTED_FONT_SIZE = 8;
const SERIF_CHARACTER_EM = 0.52;
const SANS_CHARACTER_EM = 0.64;

export const FACE_FAMILIES: Record<TitleFace, string> = {
    sans: 'var(--font-sans)',
    grotesk: 'var(--font-display)',
    serif: 'var(--font-serif-display)',
};

/** Long titles shrink to fit the spine instead of being cut off. */
export function titleFontSize(
    title: string,
    spineWidth: number,
    availableLength: number,
    face: TitleFace,
): number {
    const isSerif = face === 'serif';
    const preferred =
        Math.max(
            MIN_FONT_SIZE,
            Math.min(MAX_FONT_SIZE, Math.round(spineWidth * FONT_RATIO)),
        ) + (isSerif ? SERIF_BONUS : 0);
    const characterEm = isSerif ? SERIF_CHARACTER_EM : SANS_CHARACTER_EM;
    const fitting = Math.floor(availableLength / (title.length * characterEm));

    return Math.max(MIN_FITTED_FONT_SIZE, Math.min(preferred, fitting));
}
