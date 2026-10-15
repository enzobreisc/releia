/** Progresso de uma leitura, calculado no servidor (ReadingService::progress). */
export type ReadingProgress = {
    current_page: number;
    pages: number | null;
    percent: number | null;
    /** Páginas por dia em que houve leitura. */
    pace: number | null;
    days_left: number | null;
    finish_suggested: boolean;
};

export type ReadingSummary = ReadingProgress & {
    reading_id: number;
    book_id: number;
    title: string;
    authors: string;
    cover_url: string | null;
};

/** Mini cartão "lendo agora" da barra lateral (dado compartilhado). */
export type SidebarReading = ReadingSummary & {
    /** Níveis 0 a 4 dos últimos sete dias, do mais antigo ao de hoje. */
    week: number[];
    streak: number;
};

export type ReadingSession = {
    id: number;
    hash: string;
    read_on: string;
    page_from: number;
    page_to: number;
    pages: number;
    minutes: number | null;
};

export type YearGoal = {
    year: number;
    goal: number | null;
    finished: number;
    projected: number;
};
