import type { Bookshelf, SpineBook } from '@/types';

/** `given` mantém a ordem recebida (o Perfil manda os livros por data de término). */
export type ShelfGroup =
    'genre' | 'author' | 'title' | 'year' | 'custom' | 'given';

export const SHELF_GROUPS: { value: ShelfGroup; label: string }[] = [
    { value: 'genre', label: 'Gênero' },
    { value: 'author', label: 'Autor (A–Z)' },
    { value: 'title', label: 'Título (A–Z)' },
    { value: 'year', label: 'Lançamento' },
    { value: 'custom', label: 'Personalizada' },
];

export type ShelfSection = {
    key: string;
    /** Nome da prateleira; sem nome, a seção é só uma estante contínua. */
    label: string | null;
    books: SpineBook[];
    /** Só nas prateleiras personalizadas: onde soltar um livro. */
    bookshelfId?: number | null;
    renamable?: boolean;
};

/** Cores de lombada: fundo e texto, foscas para combinar com o tema escuro. */
const PALETTE: [string, string][] = [
    ['#7a2e2e', '#f6e3d8'],
    ['#2f4f6f', '#e3eef8'],
    ['#365e4a', '#e2f1e8'],
    ['#8a6a2c', '#fbf0d6'],
    ['#4a3a6b', '#ece5f8'],
    ['#2c5f66', '#dff3f4'],
    ['#8a4a2c', '#fbe6d8'],
    ['#3f4a6b', '#e6eaf8'],
    ['#5c6b2f', '#eef3d8'],
    ['#6b2f55', '#f8e3f0'],
    ['#2f2f3a', '#dcdce6'],
    ['#a8873a', '#2a2214'],
    ['#d8cfbf', '#2b2a26'],
    ['#9c3d3d', '#fde7e7'],
];

function hash(text: string): number {
    let value = 5381;

    for (const char of text) {
        value = (value * 33 + char.charCodeAt(0)) >>> 0;
    }

    return value;
}

export type SpineColors = { bg: string; fg: string; accent: string };

const extracted = new Map<string, Promise<SpineColors | null>>();

function hex(rgb: number[]): string {
    return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function luminance([r, g, b]: number[]): number {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Cores da capa: a mais frequente entre as que têm cor (tons quase brancos, pretos ou
 * cinzas pesam pouco) vira o fundo; a segunda, bem diferente da primeira, vira a faixa.
 * O texto é claro ou escuro conforme o fundo. Sem capa legível, devolve null.
 */
export function extractColors(src: string): Promise<SpineColors | null> {
    const cached = extracted.get(src);

    if (cached) {
        return cached;
    }

    const promise = new Promise<SpineColors | null>((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onerror = () => resolve(null);
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 48;
                const context = canvas.getContext('2d', {
                    willReadFrequently: true,
                });

                if (!context) {
                    return resolve(null);
                }

                context.drawImage(image, 0, 0, 32, 48);
                const { data } = context.getImageData(0, 0, 32, 48);
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
                    // Fundo branco/preto de capa e cinzas não dizem qual é o livro.
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

                const ranked = [...bins.values()]
                    .sort((a, b) => b.weight - a.weight)
                    .map((bin) => bin.sum.map((v) => v / bin.count));

                if (ranked.length === 0) {
                    return resolve(null);
                }

                const base = ranked[0];
                const distance = (a: number[], b: number[]) =>
                    Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
                const second =
                    ranked.slice(1, 12).find((c) => distance(c, base) > 90) ??
                    base.map((v) =>
                        luminance(base) > 0.5 ? v * 0.6 : v + (255 - v) * 0.5,
                    );

                resolve({
                    bg: hex(base),
                    fg: luminance(base) > 0.55 ? '#1b1b1f' : '#f5f5f7',
                    accent: hex(second),
                });
            } catch {
                resolve(null);
            }
        };
        image.src = src;
    });

    extracted.set(src, promise);

    return promise;
}

/** Cor provisória (e reserva, sem capa): sai do título, para não ficar tudo igual. */
export function spineColors(book: SpineBook): SpineColors {
    const [bg, fg] =
        PALETTE[hash(`${book.title}${book.author ?? ''}`) % PALETTE.length];

    return { bg, fg, accent: fg };
}

/** Espessura e altura pelas páginas, com uma variação fixa por livro para não ficar uniforme. */
export function spineSize(book: SpineBook): { width: number; height: number } {
    const pages = Math.min(book.pages ?? 280, 800);
    const jitter = hash(String(book.id)) % 17;

    return {
        width: Math.round(24 + (pages / 800) * 30),
        height: 148 + Math.round((pages / 800) * 40) + jitter,
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

/** "Itamar Vieira Junior" → "vieira": sobrenome para ordenar, sem acento nem caixa. */
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
            return decades(books);
        case 'genre':
            return genres(books);
        case 'custom':
            return custom(books, bookshelves);
    }
}

function genres(books: SpineBook[]): ShelfSection[] {
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
            label: genre || 'Sem gênero',
            books: list.sort(byAuthor),
        }));
}

function decades(books: SpineBook[]): ShelfSection[] {
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
            label: decade === null ? 'Sem ano' : `Anos ${decade}`,
            books: list.sort(byYear),
        }));
}

function custom(books: SpineBook[], bookshelves: Bookshelf[]): ShelfSection[] {
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
        label: 'Sem prateleira',
        bookshelfId: null,
        books: books.filter((book) => book.bookshelf_id === null).sort(byTitle),
    });

    return sections;
}

/** Divide uma prateleira em fileiras que cabem na largura, como os livros em pé numa estante real. */
export function chunkRows(books: SpineBook[], width: number): SpineBook[][] {
    const rows: SpineBook[][] = [];
    let row: SpineBook[] = [];
    let used = 0;

    for (const book of books) {
        const next = spineSize(book).width + 3;

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
