import { normalizeSearch } from './names';

const GENERIC_WORDS =
    /\b(editora|editores|editoras)\b(?!\s*\d)|\b(ltda|s\.a\.|do brasil)\b/gu;
const WHITESPACE_RUN = /\s+/g;
const IMPRINT_PREFIXES: ReadonlyArray<readonly [string, string]> = [
    ['penguin', 'penguin-companhia'],
];
const ALIASES: ReadonlyMap<string, string> = new Map([['lpm', 'l&pm']]);

/** Spellings of one publisher share a key: "Editora Rocco" and "Rocco" both give "rocco". */
export function publisherKey(publisher: string | null): string {
    const cleaned = normalizeSearch(publisher ?? '')
        .replace(GENERIC_WORDS, '')
        .replace(WHITESPACE_RUN, ' ')
        .trim();
    const imprint = IMPRINT_PREFIXES.find(([prefix]) =>
        cleaned.startsWith(prefix),
    );

    return imprint?.[1] ?? ALIASES.get(cleaned) ?? cleaned;
}
