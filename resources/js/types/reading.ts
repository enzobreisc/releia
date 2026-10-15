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

/** Uma leitura do histórico do livro (aba Leituras). */
export type ReadingHistory = {
    id: number;
    /** 1 para a primeira leitura, 2 para a releitura… */
    number: number;
    status: string;
    status_label: string;
    started_at: string | null;
    finished_at: string | null;
    days: number | null;
    current_page: number;
    pages_per_day: number | null;
    rating: number | null;
    review: string | null;
    abandon_reason: string | null;
    sessions_count: number;
    first_session_on: string | null;
    last_session_on: string | null;
    sessions: ReadingSession[];
};
