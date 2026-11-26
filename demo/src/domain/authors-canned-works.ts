import type { AuthorWorks } from './authors-works';

/** Titles shown when Open Library cannot be reached for a demo author. None of them is in the demo library. */
const CANNED_TITLES: ReadonlyMap<number, readonly string[]> = new Map([
    [2, ['Homo Deus']],
    [4, ['Quincas Borba', 'Esaú e Jacó', 'Memorial de Aires']],
    [10, ['Memorial do Convento', 'O Ano da Morte de Ricardo Reis']],
    [12, ['A Paixão Segundo G.H.', 'Laços de Família']],
]);

export function cannedWorksFor(authorId: number): AuthorWorks | null {
    const titles = CANNED_TITLES.get(authorId);

    if (titles === undefined) {
        return null;
    }

    return {
        verified: true,
        owns_all: false,
        items: titles.map((title) => ({
            title,
            year: null,
            cover_url: null,
            work_key: null,
            edition_count: null,
            portuguese: true,
            isbn_13: null,
        })),
    };
}
