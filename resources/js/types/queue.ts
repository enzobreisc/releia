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
    /** Previsão de término lendo na ordem da fila. */
    finishes_on: string | null;
};

export type ShoppingEntry = {
    id: number;
    title: string;
    author: string;
    isbn: string | null;
    cover_url: string | null;
    /** Link colado ou a busca na Amazon pelo ISBN/título. */
    link: string;
    link_label: string;
    /** Busca pronta em cada loja (pelo ISBN, ou título e autor). */
    stores: { key: string; label: string; url: string }[];
    /** Link colado à mão, se houver. */
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

/** Busca de correspondência da lista de compras (recarga parcial). */
export type ShoppingMatches = {
    query: string;
    isbn_from_url: string | null;
    items: Candidate[];
};

export type Pace = {
    pages_per_day: number;
    from_sessions: boolean;
    /** Dias para ler a fila inteira; null se algum livro não tem páginas. */
    queue_days: number | null;
};

/** Loja da lista de compras, com quantos itens faltam comprar nela. */
export type StoreOption = {
    value: string;
    label: string;
    count: number;
};
