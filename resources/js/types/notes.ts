export type NoteCard = {
    id: number;
    book_id: number;
    book_title: string;
    page: number | null;
    kind: string;
    kind_label: string;
    body_md: string;
    tags: string[];
    next_review_at: string | null;
    review_count: number;
    updated_at: string | null;
};

export type NoteBook = {
    id: number;
    title: string;
};

export type NoteTagCount = {
    name: string;
    count: number;
};

export type NoteFilters = {
    q: string;
    book: number | null;
    kind: string | null;
    tag: string | null;
};
