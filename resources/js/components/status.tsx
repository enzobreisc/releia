import type { TranslationKey } from '@/lib/i18n';

/** The four shelves, as the server sends them (ReadingStatus). */
export type Status = 'want_to_read' | 'reading' | 'read' | 'abandoned';

export const STATUS_LABELS: Record<Status, TranslationKey> = {
    want_to_read: 'Quero ler',
    reading: 'Lendo',
    read: 'Lido',
    abandoned: 'Abandonado',
};

/**
 * Shelf icon: shape, color and text together, never color alone.
 * Want to read: gray ring. Reading: half full. Read: ✓. Abandoned: amber dash.
 */
export function StatusIcon({
    status,
    size = 12,
}: {
    status: string;
    size?: number;
}) {
    return (
        <svg
            aria-hidden="true"
            width={size}
            height={size}
            viewBox="0 0 12 12"
            className="shrink-0"
        >
            {status === 'read' ? (
                <>
                    <circle cx="6" cy="6" r="5.5" className="fill-link" />
                    <path
                        d="m3.5 6.2 1.7 1.7 3.3-3.4"
                        fill="none"
                        className="stroke-bg"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </>
            ) : status === 'reading' ? (
                <>
                    <circle
                        cx="6"
                        cy="6"
                        r="4.5"
                        fill="none"
                        className="stroke-accent"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M6 1.5a4.5 4.5 0 0 1 0 9z"
                        className="fill-accent"
                    />
                </>
            ) : status === 'abandoned' ? (
                <>
                    <circle
                        cx="6"
                        cy="6"
                        r="4.5"
                        fill="none"
                        className="stroke-warn"
                        strokeWidth="1.5"
                    />
                    <path
                        d="M3.8 6h4.4"
                        className="stroke-warn"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                </>
            ) : (
                <circle
                    cx="6"
                    cy="6"
                    r="4.5"
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="1.5"
                />
            )}
        </svg>
    );
}

/** Small shelf badge (Library cards). */
export function StatusBadge({
    status,
    label,
}: {
    status: string;
    label: string;
}) {
    return (
        <span className="inline-flex items-center gap-1.5 self-start text-xs font-bold text-secondary">
            <StatusIcon status={status} size={10} />
            {label}
        </span>
    );
}
