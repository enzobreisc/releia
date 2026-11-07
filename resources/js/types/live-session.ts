export type LiveSessionTimer = {
    start_page: number;
    /** Page where the reader is now, kept by the server so a reload does not lose it. */
    page: number;
    started_at: string;
    elapsed: number;
    paused: boolean;
};

export type LiveSessionDay = {
    /** Pages already saved today, across all books. */
    pages: number;
    /** Average pages on the days with reading. */
    average: number | null;
};
