import type { BookCard } from './library';
import type { LiveSessionDay, LiveSessionTimer } from './live-session';

export type HomeToday = LiveSessionDay & {
    week: number[];
    streak: number;
};

export type HomeLiveSession = {
    title: string;
    timer: LiveSessionTimer;
};

export type NextInQueue = {
    book_id: number;
    title: string;
    authors: string;
    cover_url: string | null;
    pages: number | null;
    position: number;
    total: number;
};

/** A finished book with the day it ended and how many days it took. */
export type RecentBook = BookCard & {
    finished_at: string | null;
    days: number | null;
};
