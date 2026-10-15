/** Botão de ação de um aviso (ex.: "Começar Duna", "Pôr na fila"). */
export type ToastAction = {
    label: string;
    method: 'get' | 'post' | 'patch';
    url: string;
    data?: Record<string, string | number | boolean | null>;
};

/** Aviso da última ação, vindo do servidor (App\\Support\\Toast). */
export type Toast = {
    id: string;
    kind: 'success' | 'error';
    title: string;
    sub: string | null;
    action: ToastAction | null;
    /** Token do desfazer; null quando a ação não se desfaz. */
    undo: string | null;
};
