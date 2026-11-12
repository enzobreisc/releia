export type EditionLike = {
    isbn_13: string | null;
    title: string;
    publisher: string | null;
    published_year: number | null;
    library_id: number | null;
};

/** Brazilian edition: ISBN prefixes 978-85 and 978-65, same as Isbn::isBrazilian. */
export function isBrazilianIsbn(isbn: string | null): boolean {
    return !!isbn && (isbn.startsWith('97885') || isbn.startsWith('97865'));
}

export const EDITION_LIMIT = 15;

/**
 * One row per publisher and year: the dozens of identical prints of public-domain works
 * (CreateSpace, Independently published...) collapse into one. The one already in the library wins.
 */
function dedupe<T extends EditionLike>(editions: T[]): T[] {
    const seen = new Map<string, T>();

    for (const edition of editions) {
        const key = `${(edition.publisher ?? edition.title).toLowerCase().trim()}|${edition.published_year ?? ''}`;
        const kept = seen.get(key);

        if (!kept || (!kept.library_id && edition.library_id)) {
            seen.set(key, edition);
        }
    }

    return [...seen.values()];
}

/**
 * Editions to show: only the Brazilian ones (all of them when there are none), deduplicated and limited.
 * `foreign` counts the hidden foreign editions; `more` counts those hidden by the limit.
 */
export function visibleEditions<T extends EditionLike>(
    editions: T[],
    options: { showForeign: boolean; expanded: boolean },
) {
    const unique = dedupe(
        editions.filter((edition) => edition.isbn_13 !== null),
    );
    const brazilian = unique.filter((edition) =>
        isBrazilianIsbn(edition.isbn_13),
    );
    const others = unique.filter(
        (edition) => !isBrazilianIsbn(edition.isbn_13),
    );
    const list =
        options.showForeign || brazilian.length === 0
            ? [...brazilian, ...others]
            : brazilian;
    const shown = options.expanded ? list : list.slice(0, EDITION_LIMIT);

    return {
        items: shown,
        foreign: unique.length - list.length,
        more: list.length - shown.length,
    };
}
