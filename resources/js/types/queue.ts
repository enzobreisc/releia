export type QueueEntry = {
    id: number;
    title: string;
    authors: string;
    cover_url: string | null;
    queue_item_id: number;
    position: number;
    pages: number | null;
    estimated_days: number | null;
};

export type ShoppingEntry = {
    id: number;
    title: string;
    author: string;
    isbn: string | null;
    store_type: string;
    store_label: string;
    estimated_price_cents: number | null;
    bought: boolean;
    bought_on: string | null;
    book_id: number | null;
    queued: boolean;
};

export type Pace = {
    pages_per_day: number;
    from_sessions: boolean;
};
