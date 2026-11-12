export type Suggestion = {
    id: number;
    title: string;
    authors: string;
    cover_url: string | null;
    reason: string;
    based_on: string;
    has_editions: boolean;
};
