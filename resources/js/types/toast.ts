export type ToastAction = {
    label: string;
    method: 'get' | 'post' | 'patch';
    url: string;
    data?: Record<string, string | number | boolean | null>;
};

/** Notice for the last action, built by the server (App\\Support\\Toast). */
export type Toast = {
    id: string;
    kind: 'success' | 'error';
    title: string;
    sub: string | null;
    action: ToastAction | null;
    /** Token to undo the action; null when it cannot be undone. */
    undo: string | null;
};
