import type { TranslationKey } from '@/lib/i18n';
import type { BookDetail, Candidate } from '@/types';
import type { Diff, EditorForm, Fields } from './types';

export function initialFields(book: BookDetail): Fields {
    return {
        title: book.title,
        subtitle: book.subtitle ?? '',
        // One by one, as saved: splitting the text "A, B" on commas breaks names like "Silva, João".
        authors: book.author_links.map((author) => author.name),
        pages: book.pages?.toString() ?? '',
        genre: book.genre ?? '',
        publisher: book.publisher ?? '',
        published_year: book.published_year?.toString() ?? '',
        series: book.series ?? '',
        series_position: book.series_position?.toString() ?? '',
        isbn_13: book.isbn_13 ?? '',
        description: book.description ?? '',
        cover_url: '',
        cover_file: null,
    };
}

export function countChanges(current: Fields, initial: Fields): number {
    return (Object.keys(initial) as (keyof Fields)[]).filter((key) =>
        key === 'authors'
            ? current.authors.join('|') !== initial.authors.join('|')
            : current[key] !== initial[key],
    ).length;
}

export function diffsFrom(
    fields: Fields,
    candidate: Candidate,
    emptyLabel: string,
): Diff[] {
    const pairs: [Diff['key'], TranslationKey, string, string | null][] = [
        ['title', 'título', fields.title, candidate.title],
        ['subtitle', 'subtítulo', fields.subtitle, candidate.subtitle],
        [
            'authors',
            'autores',
            fields.authors.join(', '),
            candidate.authors.join(', '),
        ],
        ['pages', 'páginas', fields.pages, candidate.pages?.toString() ?? null],
        ['publisher', 'editora', fields.publisher, candidate.publisher],
        [
            'published_year',
            'ano',
            fields.published_year,
            candidate.published_year?.toString() ?? null,
        ],
        ['genre', 'gênero', fields.genre, candidate.genre],
        ['description', 'sinopse', fields.description, candidate.description],
        [
            'cover_url',
            'capa',
            'atual',
            candidate.cover_url ? 'nova da fonte' : null,
        ],
    ];

    return pairs
        .filter(([, , from, to]) => to !== null && to !== '' && to !== from)
        .map(([key, label, from, to]) => ({
            key,
            label,
            from: from === '' ? emptyLabel : from,
            to: to!,
        }));
}

export function serverErrors(
    form: EditorForm,
): Record<string, string | undefined> {
    return form.errors as Record<string, string | undefined>;
}
