import type { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import type { Bookshelf, SpineBook } from '@/types';

type Translator = Pick<
    ReturnType<typeof useTranslation>,
    't' | 'translateText'
>;

/** `given` keeps the received order (the Profile sends books by finish date). */
export type ShelfGroup =
    | 'genre'
    | 'author'
    | 'title'
    | 'year'
    | 'custom'
    | 'given';

export const SHELF_GROUPS: { value: ShelfGroup; label: TranslationKey }[] = [
    { value: 'genre', label: 'Gênero' },
    { value: 'author', label: 'Autor (A–Z)' },
    { value: 'title', label: 'Título (A–Z)' },
    { value: 'year', label: 'Lançamento' },
    { value: 'custom', label: 'Personalizada' },
];

export type ShelfSection = {
    key: string;
    /** Shelf name; without one, the section is just a continuous shelf. */
    label: string | null;
    books: SpineBook[];
    /** Only on custom shelves: where a book can be dropped. */
    bookshelfId?: number | null;
    renamable?: boolean;
};

export const SPINE_INK_LIGHT = '#f4f1ea';
export const SPINE_INK_DARK = '#0b0d12';
export const SPINE_RECESSED_BACKGROUND = 'var(--color-elevated)';
export const SPINE_RECESSED_TEXT = 'var(--color-text)';
export const SPINE_RING_WIDTH = 2;

/** Night blues used when a book has no readable cover. */
export const SPINE_FALLBACK_COLORS = [
    '#17365f',
    '#1d4f9e',
    '#2563c4',
    '#0f2a4d',
    '#33425c',
    '#5b9bff',
    '#bcd7ff',
];

const COVER_SAMPLE_WIDTH = 32;
const COVER_SAMPLE_HEIGHT = 48;

const SPINE_HEIGHTS = [212, 236, 224, 250, 204, 242];
export const SPINE_MAX_HEIGHT = Math.max(...SPINE_HEIGHTS);
const SPINE_MIN_WIDTH = 24;
const SPINE_MAX_WIDTH = 64;
const SPINE_WIDTH_BASE = 18;
const SPINE_PAGES_PER_PIXEL = 11;
const SPINE_DEFAULT_PAGES = 280;
const SPINE_MIN_FONT_SIZE = 16;
const SPINE_MAX_FONT_SIZE = 30;
const SPINE_FONT_RATIO = 0.62;
export const SPINE_GAP = 6;
export const SPINE_VERTICAL_PADDING = 10;

function channelLuminance(value: number): number {
    const unit = value / 255;

    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
    const [red, green, blue] = [1, 3, 5].map((start) =>
        channelLuminance(parseInt(hex.slice(start, start + 2), 16)),
    );

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
    const [lighter, darker] = [
        relativeLuminance(first),
        relativeLuminance(second),
    ].sort((a, b) => b - a);

    return (lighter + 0.05) / (darker + 0.05);
}

const extractedCovers = new Map<string, Promise<string | null>>();

/**
 * Dominant cover color: the most frequent among those with color (near-white,
 * black and gray tones weigh little). Null when the cover cannot be read.
 */
export function extractCoverColor(src: string): Promise<string | null> {
    const cached = extractedCovers.get(src);

    if (cached) {
        return cached;
    }

    const promise = new Promise<string | null>((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onerror = () => resolve(null);
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = COVER_SAMPLE_WIDTH;
                canvas.height = COVER_SAMPLE_HEIGHT;
                const context = canvas.getContext('2d', {
                    willReadFrequently: true,
                });

                if (!context) {
                    return resolve(null);
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    COVER_SAMPLE_WIDTH,
                    COVER_SAMPLE_HEIGHT,
                );
                const { data } = context.getImageData(
                    0,
                    0,
                    COVER_SAMPLE_WIDTH,
                    COVER_SAMPLE_HEIGHT,
                );
                const bins = new Map<
                    number,
                    { weight: number; sum: number[]; count: number }
                >();

                for (let i = 0; i < data.length; i += 4) {
                    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    const saturation = max === 0 ? 0 : (max - min) / max;
                    const light = max / 255;
                    // White/black cover backgrounds and grays do not say which book it is.
                    const weight =
                        0.15 +
                        saturation *
                            2 *
                            (light > 0.95 || light < 0.08 ? 0.1 : 1);
                    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
                    const bin = bins.get(key) ?? {
                        weight: 0,
                        sum: [0, 0, 0],
                        count: 0,
                    };

                    bin.weight += weight;
                    bin.count += 1;
                    bin.sum = [bin.sum[0] + r, bin.sum[1] + g, bin.sum[2] + b];
                    bins.set(key, bin);
                }

                const [top] = [...bins.values()].sort(
                    (a, b) => b.weight - a.weight,
                );

                if (!top) {
                    return resolve(null);
                }

                resolve(
                    `#${top.sum
                        .map((v) =>
                            Math.round(v / top.count)
                                .toString(16)
                                .padStart(2, '0'),
                        )
                        .join('')}`,
                );
            } catch {
                resolve(null);
            }
        };
        image.src = src;
    });

    extractedCovers.set(src, promise);

    return promise;
}

export function pickInk(background: string): string {
    return contrastRatio(background, SPINE_INK_DARK) >=
        contrastRatio(background, SPINE_INK_LIGHT)
        ? SPINE_INK_DARK
        : SPINE_INK_LIGHT;
}

function hash(text: string): number {
    let value = 5381;

    for (const char of text) {
        value = (value * 33 + char.charCodeAt(0)) >>> 0;
    }

    return value;
}

export function fallbackColor(book: SpineBook): string {
    return SPINE_FALLBACK_COLORS[
        hash(`${book.title}${book.author ?? ''}`) % SPINE_FALLBACK_COLORS.length
    ];
}

export type SpineLook = { width: number; height: number; fontSize: number };

export function spineLook(book: SpineBook): SpineLook {
    const pages = book.pages ?? SPINE_DEFAULT_PAGES;
    const width = Math.max(
        SPINE_MIN_WIDTH,
        Math.min(
            SPINE_MAX_WIDTH,
            Math.round(SPINE_WIDTH_BASE + pages / SPINE_PAGES_PER_PIXEL),
        ),
    );

    return {
        width,
        height: SPINE_HEIGHTS[book.id % SPINE_HEIGHTS.length],
        fontSize: Math.max(
            SPINE_MIN_FONT_SIZE,
            Math.min(SPINE_MAX_FONT_SIZE, Math.round(width * SPINE_FONT_RATIO)),
        ),
    };
}

const SUFFIXES = new Set([
    'jr',
    'jr.',
    'junior',
    'júnior',
    'filho',
    'neto',
    'sobrinho',
]);

/** "Itamar Vieira Junior" → "vieira": surname for sorting, without accents or case. */
function surname(author: string | null): string {
    const words = (author ?? '').trim().split(/\s+/).filter(Boolean);

    while (
        words.length > 1 &&
        SUFFIXES.has(words[words.length - 1].toLowerCase())
    ) {
        words.pop();
    }

    return (words.pop() ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

function plain(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
}

const byTitle = (a: SpineBook, b: SpineBook) =>
    plain(a.title).localeCompare(plain(b.title), 'pt');

const byAuthor = (a: SpineBook, b: SpineBook) =>
    surname(a.author).localeCompare(surname(b.author), 'pt') ||
    (a.published_year ?? 9999) - (b.published_year ?? 9999) ||
    byTitle(a, b);

const byYear = (a: SpineBook, b: SpineBook) =>
    (a.published_year ?? 9999) - (b.published_year ?? 9999) || byTitle(a, b);

export function buildSections(
    books: SpineBook[],
    group: ShelfGroup,
    bookshelves: Bookshelf[],
    translator: Translator,
): ShelfSection[] {
    switch (group) {
        case 'given':
            return [{ key: 'given', label: null, books }];
        case 'author':
            return [
                {
                    key: 'author',
                    label: null,
                    books: [...books].sort(byAuthor),
                },
            ];
        case 'title':
            return [
                { key: 'title', label: null, books: [...books].sort(byTitle) },
            ];
        case 'year':
            return decades(books, translator);
        case 'genre':
            return genres(books, translator);
        case 'custom':
            return custom(books, bookshelves, translator);
    }
}

function genres(
    books: SpineBook[],
    { t, translateText }: Translator,
): ShelfSection[] {
    const map = new Map<string, SpineBook[]>();

    for (const book of books) {
        const key = book.genre ?? '';
        map.set(key, [...(map.get(key) ?? []), book]);
    }

    return [...map.entries()]
        .sort(([a, x], [b, y]) =>
            a === ''
                ? 1
                : b === ''
                  ? -1
                  : y.length - x.length || a.localeCompare(b, 'pt'),
        )
        .map(([genre, list]) => ({
            key: `genre:${genre}`,
            label: genre ? translateText(genre) : t('Sem gênero'),
            books: list.sort(byAuthor),
        }));
}

function decades(books: SpineBook[], { t }: Translator): ShelfSection[] {
    const map = new Map<number | null, SpineBook[]>();

    for (const book of books) {
        const key =
            book.published_year === null
                ? null
                : Math.floor(book.published_year / 10) * 10;
        map.set(key, [...(map.get(key) ?? []), book]);
    }

    return [...map.entries()]
        .sort(([a], [b]) => (a ?? 9999) - (b ?? 9999))
        .map(([decade, list]) => ({
            key: `decade:${decade}`,
            label:
                decade === null ? t('Sem ano') : t('Anos :decade', { decade }),
            books: list.sort(byYear),
        }));
}

function custom(
    books: SpineBook[],
    bookshelves: Bookshelf[],
    { t }: Translator,
): ShelfSection[] {
    const sections: ShelfSection[] = bookshelves.map((shelf) => ({
        key: `shelf:${shelf.id}`,
        label: shelf.name,
        bookshelfId: shelf.id,
        renamable: true,
        books: books
            .filter((book) => book.bookshelf_id === shelf.id)
            .sort((a, b) => a.shelf_position - b.shelf_position),
    }));

    sections.push({
        key: 'shelf:none',
        label: t('Sem prateleira'),
        bookshelfId: null,
        books: books.filter((book) => book.bookshelf_id === null).sort(byTitle),
    });

    return sections;
}

/** Splits a shelf into rows that fit the width. */
export function chunkRows(books: SpineBook[], width: number): SpineBook[][] {
    const rows: SpineBook[][] = [];
    let row: SpineBook[] = [];
    let used = 0;

    for (const book of books) {
        const next = spineLook(book).width + SPINE_GAP;

        if (row.length > 0 && used + next > width) {
            rows.push(row);
            row = [];
            used = 0;
        }

        row.push(book);
        used += next;
    }

    if (row.length > 0) {
        rows.push(row);
    }

    return rows;
}
