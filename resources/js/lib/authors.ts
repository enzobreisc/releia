import type { AuthorIndexEntry } from '@/types';

export type AuthorSort = 'read' | 'alpha' | 'rating';

export const NON_LETTER_INITIAL = '#';

export function stripDiacritics(value: string): string {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function initialOf(name: string): string {
    const first = stripDiacritics(name).charAt(0).toUpperCase();

    return /[A-Z]/.test(first) ? first : NON_LETTER_INITIAL;
}

export function matchesSearch(name: string, search: string): boolean {
    return stripDiacritics(name)
        .toLowerCase()
        .includes(stripDiacritics(search.trim()).toLowerCase());
}

export function sortAuthors(
    authors: AuthorIndexEntry[],
    sort: AuthorSort,
): AuthorIndexEntry[] {
    const byName = (a: AuthorIndexEntry, b: AuthorIndexEntry) =>
        a.name.localeCompare(b.name);

    return [...authors].sort((a, b) => {
        if (sort === 'rating') {
            return (
                (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
                byName(a, b)
            );
        }

        if (sort === 'read') {
            return (
                b.read - a.read || b.pages_read - a.pages_read || byName(a, b)
            );
        }

        return byName(a, b);
    });
}
