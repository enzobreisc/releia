import type { Locale } from '@/lib/i18n';
import type { ReadingSession, Toast } from '@/types';

/** SQLite has no boolean type: the export keeps flags as 0 or 1. */
type Flag = 0 | 1;

export type BookSource =
    | 'open_library'
    | 'google_books'
    | 'brasil_api'
    | 'manual';
export type ReadingStatus = 'want_to_read' | 'reading' | 'read' | 'abandoned';
export type NoteKind = 'excerpt' | 'reflection' | 'quote';
export type StoreType = 'used_bookstore' | 'bookstore' | 'online';
export type RecommendationStatus =
    | 'new'
    | 'want_to_read'
    | 'dismissed'
    | 'expired';

export type BookRow = {
    id: number;
    isbn_13: string | null;
    isbn_10: string | null;
    title: string;
    subtitle: string | null;
    publisher: string | null;
    published_year: number | null;
    pages: number | null;
    genre: string | null;
    description: string | null;
    cover_path: string | null;
    source: BookSource;
    search_text: string;
    series: string | null;
    series_position: number | null;
    shelf_position: number | null;
    bookshelf_id: number | null;
    is_lying_down: Flag;
    created_at: string;
    updated_at: string;
    cover_url: string | null;
};

export type AuthorRow = {
    id: number;
    name: string;
    open_library_key: string | null;
    photo_path: string | null;
    photo_looked_up_at: string | null;
    created_at: string;
    updated_at: string;
    photo_url: string | null;
};

export type AuthorBookRow = {
    author_id: number;
    book_id: number;
    position: number;
};

export type BookshelfRow = {
    id: number;
    name: string;
    position: number;
    grouping: string | null;
    /** JSON array, kept as text as the export stores it. */
    group_keys: string | null;
    is_catch_all: Flag;
    created_at: string;
    updated_at: string;
};

export type ReadingRow = {
    id: number;
    book_id: number;
    status: ReadingStatus;
    started_at: string | null;
    finished_at: string | null;
    current_page: number;
    rating: number | null;
    review: string | null;
    abandon_reason: string | null;
    created_at: string;
    updated_at: string;
};

export type ReadingSessionRow = {
    id: number;
    reading_id: number;
    read_on: string;
    page_from: number;
    page_to: number;
    minutes: number | null;
    created_at: string;
    updated_at: string;
};

export type NoteRow = {
    id: number;
    book_id: number;
    page: number | null;
    kind: NoteKind;
    body_md: string;
    created_at: string;
    updated_at: string;
};

export type TagRow = {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
};

export type NoteTagRow = {
    note_id: number;
    tag_id: number;
};

export type QueueItemRow = {
    id: number;
    book_id: number;
    position: number;
    added_at: string;
};

export type ShoppingItemRow = {
    id: number;
    book_id: number | null;
    title: string;
    author: string;
    isbn: string | null;
    cover_url: string | null;
    cover_path: string | null;
    url: string | null;
    store_type: StoreType;
    is_priority: Flag;
    estimated_price_cents: number | null;
    price_checked_at: string | null;
    bought_at: string | null;
    created_at: string;
    updated_at: string;
};

export type RecommendationRow = {
    id: number;
    title: string;
    author: string | null;
    isbn_13: string | null;
    cover_url: string | null;
    reason: string;
    based_on_book_id: number | null;
    status: RecommendationStatus;
    work_key: string | null;
    created_at: string;
};

type BookEmbeddingRow = {
    id: number;
    book_id: number;
    model: string;
    /** Binary column; the export keeps whatever encoding the exporter chose. */
    vector: string;
    source_hash: string;
    created_at: string;
    updated_at: string;
};

type SettingRow = {
    key: string;
    /** JSON text, as the export stores it. */
    value: string | null;
    created_at: string;
    updated_at: string;
};

export type DemoTables = {
    books: BookRow[];
    authors: AuthorRow[];
    author_book: AuthorBookRow[];
    bookshelves: BookshelfRow[];
    readings: ReadingRow[];
    reading_sessions: ReadingSessionRow[];
    notes: NoteRow[];
    tags: TagRow[];
    note_tag: NoteTagRow[];
    queue_items: QueueItemRow[];
    shopping_items: ShoppingItemRow[];
    recommendations: RecommendationRow[];
    book_embeddings: BookEmbeddingRow[];
    settings: SettingRow[];
};

export type TableName = keyof DemoTables;

/** The file produced by demo/export: the data as it was on `exported_on`. */
export type DemoStateFile = {
    exported_on: string;
    tables: DemoTables;
};

/**
 * The reading timer, as the app keeps it: instants are ISO text and the elapsed time is
 * derived from them, so a reload or a closed tab keeps counting from the right moment.
 */
export type LiveTimerState = {
    book_id: number;
    start_page: number;
    page: number;
    started_at: string;
    paused_at: string | null;
    paused_seconds: number;
};

/** The summary a finished quick-log entry flashes to the next quick-log page. */
export type QuickLogSaved = ReadingSession & {
    title: string;
    book_id: number;
    streak: number;
    finished: boolean;
    days: number | null;
    next: { id: number; title: string } | null;
};

/** Client-only state: never exported, and only partly persisted (see store.ts). */
export type DemoRuntime = {
    /** The `exported_on` the saved state was built from; a new export discards it. */
    sourceExportedOn: string;
    locale: Locale;
    liveTimer: LiveTimerState | null;
    flashToast: Toast | null;
    quickLogSaved: QuickLogSaved | null;
};

/** `exported_on` is the day the tables were last shifted to, so they stay current. */
export type DemoState = {
    exported_on: string;
    tables: DemoTables;
    runtime: DemoRuntime;
};
