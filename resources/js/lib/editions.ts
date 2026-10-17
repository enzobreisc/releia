/** O que a lista de edições precisa de cada uma para agrupar e filtrar. */
export type EditionLike = {
    isbn_13: string | null;
    title: string;
    publisher: string | null;
    published_year: number | null;
    library_id: number | null;
};

/** Edição brasileira: prefixos 978-85 e 978-65 (igual a Isbn::isBrazilian). */
export function isBrazilianIsbn(isbn: string | null): boolean {
    return !!isbn && (isbn.startsWith('97885') || isbn.startsWith('97865'));
}

/** Quantas edições aparecem antes de "mostrar mais". */
export const EDITION_LIMIT = 15;

/**
 * Uma linha por editora e ano: as dezenas de impressões iguais de obras de domínio público
 * (CreateSpace, Independently published...) viram uma só. A que já está na biblioteca vence.
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
 * Edições para mostrar: só as brasileiras (sem nenhuma, as demais), sem repetidas e limitadas.
 * `foreign` conta as de outros países escondidas; `more` as escondidas pelo limite.
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
