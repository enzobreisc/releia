import type { ReadingSummary } from '@/types';

export type Timer = {
    book_id: number;
    start_page: number;
    elapsed: number;
    paused: boolean;
};

export type AvailableBook = { id: number; title: string };

export type Saved = {
    hash: string;
    title: string;
    book_id: number;
    page_from: number;
    page_to: number;
    pages: number;
    minutes: number | null;
    streak: number;
    /** The session reached the last page: the book was marked as read. */
    finished: boolean;
    days: number | null;
    next: AvailableBook | null;
};

export type QuickLogProps = {
    readings: ReadingSummary[];
    available: AvailableBook[];
    timer: Timer | null;
    week: number[];
    streak: number;
    shortcut: string;
    saved: Saved | null;
};
