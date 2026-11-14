import { pickInk, readableOn, toneAccentAsGround, toneGround } from './colors';
import type { CoverColors } from './cover-colors';
import { hash } from './hash';
import { identityFor } from './publisher-identity';
import type { SpineBook } from '@/types';

export type SpineColors = {
    ground: string;
    ink: string;
    accent: string | null;
    titleColor: string;
};

/** Night blues used when a book has no readable cover. */
const FALLBACK_GROUNDS = [
    '#17365f',
    '#1d4f9e',
    '#2563c4',
    '#0f2a4d',
    '#33425c',
    '#5b9bff',
    '#bcd7ff',
];
const COVER_CREAM = '#e7e5cf';
const UNTITLED_COLOR_GROUND = '#2b2b30';

function fallbackGround(book: SpineBook): string {
    return FALLBACK_GROUNDS[
        hash(`${book.title}${book.author ?? ''}`) % FALLBACK_GROUNDS.length
    ];
}

export function resolveSpineColors(
    book: SpineBook,
    cover: CoverColors,
): SpineColors {
    const identity = identityFor(book.publisher_key);

    const ground = identity.groundFromAccent
        ? cover.accent
            ? toneAccentAsGround(cover.accent)
            : UNTITLED_COLOR_GROUND
        : cover.ground
          ? toneGround(cover.ground)
          : fallbackGround(book);
    const accent = identity.groundFromAccent ? COVER_CREAM : cover.accent;
    const ink = pickInk(ground);

    return { ground, ink, accent, titleColor: readableOn(accent, ground, ink) };
}
