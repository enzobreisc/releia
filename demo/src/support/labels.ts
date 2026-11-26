import { translateText, type Locale } from '@/lib/i18n';
import type {
    BookSource,
    NoteKind,
    ReadingStatus,
    StoreType,
} from '../state/types';

const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
    want_to_read: 'Quero ler',
    reading: 'Lendo',
    read: 'Lido',
    abandoned: 'Abandonado',
};

const READING_SHELF_LABELS: Record<ReadingStatus, string> = {
    want_to_read: 'Quero ler',
    reading: 'Lendo',
    read: 'Lidos',
    abandoned: 'Abandonados',
};

const NOTE_KIND_LABELS: Record<NoteKind, string> = {
    excerpt: 'Trecho',
    reflection: 'Reflexão',
    quote: 'Citação',
};

const STORE_TYPE_LABELS: Record<StoreType, string> = {
    used_bookstore: 'Sebo',
    bookstore: 'Livraria',
    online: 'Online',
};

const BOOK_SOURCE_LABELS: Record<BookSource, string> = {
    open_library: 'Open Library',
    google_books: 'Google Books',
    brasil_api: 'BrasilAPI',
    manual: 'Manual',
};

const LANGUAGE_TAGS: Record<Locale, string> = { pt_BR: 'pt-BR', en: 'en-US' };

export function readingStatusLabel(
    locale: Locale,
    status: ReadingStatus,
): string {
    return translateText(locale, READING_STATUS_LABELS[status]);
}

export function readingShelfLabel(
    locale: Locale,
    status: ReadingStatus,
): string {
    return translateText(locale, READING_SHELF_LABELS[status]);
}

export function noteKindLabel(locale: Locale, kind: NoteKind): string {
    return translateText(locale, NOTE_KIND_LABELS[kind]);
}

export function storeTypeLabel(locale: Locale, store: StoreType): string {
    return translateText(locale, STORE_TYPE_LABELS[store]);
}

/** Source names are product names, so only the "Manual" label is translated. */
export function bookSourceLabel(locale: Locale, source: BookSource): string {
    return translateText(locale, BOOK_SOURCE_LABELS[source]);
}

export function languageTag(locale: Locale): string {
    return LANGUAGE_TAGS[locale];
}
