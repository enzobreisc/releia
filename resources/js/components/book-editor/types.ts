import type { InertiaFormProps } from '@inertiajs/react';
import type { TranslationKey } from '@/lib/i18n';

export type Fields = {
    title: string;
    subtitle: string;
    authors: string[];
    pages: string;
    genre: string;
    publisher: string;
    published_year: string;
    series: string;
    series_position: string;
    isbn_13: string;
    description: string;
    cover_url: string;
    cover_file: File | null;
};

export type EditorForm = InertiaFormProps<Fields>;

export type Diff = {
    key:
        | 'title'
        | 'subtitle'
        | 'authors'
        | 'pages'
        | 'publisher'
        | 'published_year'
        | 'genre'
        | 'description'
        | 'cover_url';
    label: TranslationKey;
    from: string;
    to: string;
};
