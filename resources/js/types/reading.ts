/** Reading progress, computed on the server by ReadingService::progress. */
export type ReadingProgress = {
    current_page: number;
    pages: number | null;
    percent: number | null;
    /** Pages per day, counting only the days with reading. */
    pace: number | null;
    days_left: number | null;
    finish_suggested: boolean;
};

export type ReadingSummary = ReadingProgress & {
    reading_id: number;
    book_id: number;
    title: string;
    authors: string;
    cover_url: string | null;
};

/** Compact "reading now" card for the sidebar, from shared Inertia data. */
export type SidebarReading = ReadingSummary & {
    /** Levels 0 to 4 for the last seven days, oldest to today. */
    week: number[];
    streak: number;
};

export type ReadingSession = {
    id: number;
    hash: string;
    read_on: string;
    page_from: number;
    page_to: number;
    pages: number;
    minutes: number | null;
};

export type YearGoal = {
    year: number;
    goal: number | null;
    finished: number;
    projected: number;
};

export type ReadingHistory = {
    id: number;
    /** 1 for the first reading, 2 for the reread, and so on. */
    number: number;
    status: string;
    status_label: string;
    started_at: string | null;
    finished_at: string | null;
    days: number | null;
    current_page: number;
    pages_per_day: number | null;
    rating: number | null;
    review: string | null;
    abandon_reason: string | null;
    sessions_count: number;
    first_session_on: string | null;
    last_session_on: string | null;
    sessions: ReadingSession[];
};
