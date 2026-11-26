const COMBINING_MARKS = /\p{M}/gu;
const SEPARATOR_RUN = /[^a-z0-9]+/g;
const EDGE_SEPARATORS = /^-+|-+$/g;

/** Str::slug: the ASCII form of a title, words joined by hyphens. */
export function slugOf(text: string): string {
    return text
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .toLowerCase()
        .replace(SEPARATOR_RUN, '-')
        .replace(EDGE_SEPARATORS, '');
}
