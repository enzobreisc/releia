/** Sugestão de livro, com o motivo e o livro lido que a originou. */
export type Suggestion = {
    id: number;
    title: string;
    authors: string;
    cover_url: string | null;
    reason: string;
    based_on: string;
};
