export type TimelineStatus = 'reading' | 'read' | 'abandoned';

export type TimelineReading = {
    id: number;
    book_id: number;
    title: string;
    cover_url: string | null;
    status: TimelineStatus;
    is_reread: boolean;
    started_at: string;
    /** Null while the book is still being read. */
    finished_at: string | null;
};

export type TimelineYear = {
    year: number;
    readings: TimelineReading[];
};
