export type Suggestion = {
    id: number;
    title: string;
    authors: string;
    cover_url: string | null;
    reason: string;
    based_on: string | null;
    has_editions: boolean;
};

export type SuggestionAvailability =
    | 'ready'
    | 'server_unreachable'
    | 'model_missing';

export type SuggestionRequest = {
    text: string;
    authors: string[];
    excluded_authors: string[];
    max_pages: number | null;
    found: number;
    results: Suggestion[];
};

export type RequestFilters = {
    authors: string[];
    excludedAuthors: string[];
    maxPages: number | null;
};
