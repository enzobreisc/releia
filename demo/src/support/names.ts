const GENERATIONAL_SUFFIXES: ReadonlySet<string> = new Set([
    'jr',
    'jr.',
    'junior',
    'filho',
    'neto',
    'sobrinho',
]);
const WHITESPACE = /\s+/;
const COMBINING_MARKS = /\p{M}/gu;

function words(text: string): string[] {
    return text.split(WHITESPACE).filter((word) => word !== '');
}

function dropGenerationalSuffixes(
    parts: string[],
    isSuffix: (word: string) => boolean,
): string[] {
    const kept = [...parts];

    while (kept.length > 1) {
        const last = kept[kept.length - 1];

        if (last === undefined || !isSuffix(last)) {
            break;
        }

        kept.pop();
    }

    return kept;
}

/** Book::normalizeSearch: accents dropped, lower case, single spaces. */
export function normalizeSearch(value: string): string {
    return words(
        value.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase(),
    ).join(' ');
}

/** "Itamar Vieira Júnior" becomes "vieira": the sorting surname, without accents or case. */
export function authorSurname(name: string | null): string {
    const kept = dropGenerationalSuffixes(
        words(normalizeSearch(name ?? '')),
        (word) => GENERATIONAL_SUFFIXES.has(word),
    );

    return kept[kept.length - 1] ?? '';
}

/** "Itamar Vieira Júnior" becomes "Vieira": the surname as printed on a spine. */
export function authorLastName(name: string | null): string {
    const kept = dropGenerationalSuffixes(words(name ?? ''), (word) =>
        GENERATIONAL_SUFFIXES.has(normalizeSearch(word)),
    );

    return kept[kept.length - 1] ?? '';
}
