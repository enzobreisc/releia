import type { useForm } from '@inertiajs/react';
import { today } from '@/lib/dates';
import type { Candidate } from '@/types';

export type BookForm = {
    title: string;
    subtitle: string;
    authors: string;
    isbn_13: string;
    publisher: string;
    published_year: string;
    series: string;
    series_position: string;
    pages: string;
    genre: string;
    description: string;
    cover_url: string;
    source: string;
    status: string;
    /** Only for "read": when it was finished. */
    finished_on: string;
    undated: boolean;
};

export type BookFormHandle = ReturnType<typeof useForm<BookForm>>;

type BookDetails = Omit<BookForm, 'status' | 'finished_on' | 'undated'>;

export const MANUAL_SOURCE = 'manual';
export const READ_STATUS = 'read';

export const emptyForm: BookForm = {
    title: '',
    subtitle: '',
    authors: '',
    isbn_13: '',
    publisher: '',
    published_year: '',
    series: '',
    series_position: '',
    pages: '',
    genre: '',
    description: '',
    cover_url: '',
    source: MANUAL_SOURCE,
    status: 'want_to_read',
    finished_on: '',
    undated: false,
};

export const SOURCE_NAMES: Record<string, string> = {
    open_library: 'Open Library',
    google_books: 'Google Books',
    brasil_api: 'BrasilAPI',
};

export function toForm(candidate: Candidate): BookDetails {
    return {
        title: candidate.title,
        subtitle: candidate.subtitle ?? '',
        authors: candidate.authors.join(', '),
        isbn_13: candidate.isbn_13 ?? '',
        publisher: candidate.publisher ?? '',
        published_year: candidate.published_year?.toString() ?? '',
        series: '',
        series_position: '',
        pages: candidate.pages?.toString() ?? '',
        genre: candidate.genre ?? '',
        description: candidate.description ?? '',
        cover_url: candidate.cover_url ?? '',
        source: candidate.source,
    };
}

export function candidateKey(candidate: Candidate): string {
    return candidate.isbn_13 ?? `${candidate.work_key}-${candidate.title}`;
}

export function readingStateOf(
    data: BookForm,
): Pick<BookForm, 'status' | 'finished_on' | 'undated'> {
    return {
        status: data.status,
        finished_on: data.finished_on,
        undated: data.undated,
    };
}

export function fillBlankFields(
    data: BookForm,
    details: BookDetails,
): BookForm {
    const merged = { ...data };

    for (const key of Object.keys(details) as (keyof BookDetails)[]) {
        if (merged[key] === '') {
            merged[key] = details[key];
        }
    }

    return merged;
}

export function withStatus(data: BookForm, status: string): BookForm {
    return {
        ...data,
        status,
        finished_on:
            status === READ_STATUS && data.finished_on === ''
                ? today()
                : data.finished_on,
    };
}
