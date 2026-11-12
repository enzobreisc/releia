/** A finished (or pinned) reading with its book data, as Inertia sends it. */
export type ReadingRef = {
    id: number;
    title: string;
    authors: string;
    genre: string | null;
    cover_url: string | null;
    rating: number | null;
    pages: number | null;
    days: number | null;
    finished_at: string | null;
};

export type NamedCount = {
    label: string;
    count: number;
};

export type CalendarDay = {
    date: string;
    pages: number;
    level: number;
};

export type MonthlyBar = {
    label: string;
    count: number;
};

export type Indicators = {
    books_read: number;
    /** Rereads already included in books_read. */
    rereads: number;
    pages_read: number;
    pages_per_day: number | null;
    pages_per_reading_day: number | null;
    reading_days: number;
    days_per_book: number | null;
};

export type Streak = {
    current: number;
    longest: number;
};

export type Forecast = {
    projection: number;
    goal: number | null;
    books: number;
};
