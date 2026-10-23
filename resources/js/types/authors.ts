export type AuthorIndexBook = {
    id: number;
    title: string;
    cover_url: string | null;
    is_read: boolean;
};

export type AuthorIndexEntry = {
    id: number;
    name: string;
    owned: number;
    read: number;
    pages_read: number;
    average_rating: number | null;
    /** Percent of all pages read that came from this author; null before any reading. */
    reading_share: number | null;
    last_finished_title: string | null;
    books: AuthorIndexBook[];
};
