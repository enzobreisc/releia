export type Option = {
    value: string;
    label: string;
};

export type BookCard = {
    id: number;
    title: string;
    authors: string;
    cover_url: string | null;
    status: string | null;
    status_label: string | null;
    rating: number | null;
    /** Posição na fila (Biblioteca); null fora da fila ou em outras telas. */
    queue_position: number | null;
    /** Número de leituras do livro (Biblioteca); mais de uma é releitura. */
    readings_count: number | null;
};

/** Cartão com o que a estante de lombadas precisa para ordenar, agrupar e desenhar. */
export type SpineBook = BookCard & {
    author: string | null;
    genre: string | null;
    pages: number | null;
    published_year: number | null;
    bookshelf_id: number | null;
    shelf_position: number;
};

/** Prateleira personalizada (não confundir com `Shelf`, a estante por status). */
export type Bookshelf = {
    id: number;
    name: string;
};

export type Shelf = {
    value: string | null;
    label: string;
    count: number;
};

export type BookDetail = {
    id: number;
    title: string;
    subtitle: string | null;
    authors: string;
    author_links: { id: number; name: string }[];
    isbn_13: string | null;
    publisher: string | null;
    published_year: number | null;
    pages: number | null;
    genre: string | null;
    description: string | null;
    cover_url: string | null;
    source_label: string;
    reading: {
        id: number;
        status: string;
        abandon_reason: string | null;
        rating: number | null;
        review: string | null;
        started_at: string | null;
        finished_at: string | null;
        current_page: number;
    } | null;
    readings_count: number;
};

/** Resultado de busca na Open Library ou no Google Books. */
export type Candidate = {
    isbn_13: string | null;
    isbn_10: string | null;
    title: string;
    subtitle: string | null;
    authors: string[];
    publisher: string | null;
    published_year: number | null;
    pages: number | null;
    genre: string | null;
    description: string | null;
    cover_url: string | null;
    source: string;
    /** Obra da Open Library; a busca por título devolve obras. */
    work_key?: string | null;
    edition_count?: number | null;
    /** Código do idioma da edição (por, eng…). */
    language?: string | null;
    library_id: number | null;
};

export type Editions = {
    work_key: string;
    items: Candidate[];
};
