import type { Candidate } from './library';

export type QueueEntry = {
    id: number;
    title: string;
    authors: string;
    cover_url: string | null;
    queue_item_id: number;
    position: number;
    pages: number | null;
    estimated_days: number | null;
    /** Expected finish date, reading in queue order. */
    finishes_on: string | null;
};

export type ShoppingEntry = {
    id: number;
    title: string;
    author: string;
    isbn: string | null;
    cover_url: string | null;
    /** Pasted link, or the Amazon search by ISBN/title. */
    link: string;
    link_label: string;
    /** Ready-made search in each store (by ISBN, or title and author). */
    stores: { key: string; label: string; url: string }[];
    /** Link pasted by hand, if any. */
    saved_link: string | null;
    store_type: string;
    store_label: string;
    estimated_price_cents: number | null;
    price_checked_on: string | null;
    price_stale: boolean;
    bought: boolean;
    bought_on: string | null;
    book_id: number | null;
    queued: boolean;
};

/** Shopping list match search (partial reload). */
export type ShoppingMatches = {
    query: string;
    isbn_from_url: string | null;
    items: Candidate[];
};

export type Pace = {
    pages_per_day: number;
    from_sessions: boolean;
    /** Days to read the whole queue; null if any book has no page count. */
    queue_days: number | null;
};

/** Shopping list store, with how many items are left to buy there. */
export type StoreOption = {
    value: string;
    label: string;
    count: number;
};
