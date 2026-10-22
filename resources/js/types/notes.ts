export type NoteCard = {
    id: number;
    book_id: number;
    book_title: string;
    page: number | null;
    kind: string;
    kind_label: string;
    body_md: string;
    tags: string[];
    updated_at: string | null;
};

export type NoteBook = {
    id: number;
    title: string;
};
