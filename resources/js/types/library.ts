export type Option = {
    value: string;
    label: string;
};

export type BookCard = {
    id: number;
    title: string;
    authors: string;
    cover_url: string | null;
    status: string | null;
    status_label: string | null;
    rating: number | null;
    /** Position in the queue, shown in the Library; null outside the queue or on other screens. */
    queue_position: number | null;
    /** Number of readings of the book, shown in the Library; more than one means a reread. */
    readings_count: number | null;
};

/** Book fields the spine shelf needs to draw. */
export type SpineBook = BookCard & {
    author: string | null;
    /** Last name as printed on a spine. */
    author_surname: string;
    publisher: string | null;
    /** The publisher's name normalized, so spellings of one publisher group together. */
    publisher_key: string;
    pages: number | null;
};

/** Library book with its slot in the shelf order, which the server computes. */
export type LibraryBook = SpineBook & {
    shelf_rank: number;
};

export type Shelf = {
    value: string | null;
    label: string;
    count: number;
};

export type BookDetail = {
    id: number;
    title: string;
    subtitle: string | null;
    authors: string;
    author_links: { id: number; name: string }[];
    isbn_13: string | null;
    publisher: string | null;
    published_year: number | null;
    pages: number | null;
    genre: string | null;
    series: string | null;
    series_position: number | null;
    description: string | null;
    cover_url: string | null;
    source_label: string;
    reading: {
        id: number;
        status: string;
        abandon_reason: string | null;
        rating: number | null;
        review: string | null;
        started_at: string | null;
        finished_at: string | null;
        current_page: number;
    } | null;
    readings_count: number;
};

/** Search result from Open Library or Google Books. */
export type Candidate = {
    isbn_13: string | null;
    isbn_10: string | null;
    title: string;
    subtitle: string | null;
    authors: string[];
    publisher: string | null;
    published_year: number | null;
    pages: number | null;
    genre: string | null;
    description: string | null;
    cover_url: string | null;
    source: string;
    /** Open Library work; title searches return works. */
    work_key?: string | null;
    edition_count?: number | null;
    /** Edition language code, three letters (e.g. por, eng). */
    language?: string | null;
    library_id: number | null;
};

export type Editions = {
    work_key: string;
    items: Candidate[];
};
