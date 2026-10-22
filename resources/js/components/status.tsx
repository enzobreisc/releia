import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** The four shelves, as the server sends them (ReadingStatus). */
export type Status = 'want_to_read' | 'reading' | 'read' | 'abandoned';

export const STATUS_LABELS: Record<Status, TranslationKey> = {
    want_to_read: 'Quero ler',
    reading: 'Lendo',
    read: 'Lido',
    abandoned: 'Abandonado',
};

const CHIP_RING: Record<Status, string> = {
    want_to_read: 'inset-ring-strong',
    reading: 'inset-ring-heat-2',
    read: 'inset-ring-primary',
    abandoned: 'inset-ring-warn-line',
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

/** What happens when moving from one shelf to another (menu text). */
const HINTS: Record<Status, Partial<Record<Status, TranslationKey>>> = {
    want_to_read: {
        reading: 'Começa a ler hoje e sai da fila.',
        read: 'Pede data de término e nota.',
        abandoned: 'Pede um motivo (opcional).',
    },
    reading: {
        want_to_read: 'Pausa: página e sessões ficam guardadas.',
        read: 'Pede data de término e nota.',
        abandoned: 'Pede um motivo e guarda a página.',
    },
    read: {
        want_to_read:
            'Cria uma leitura nova para reler e põe na fila. A atual fica no histórico.',
        reading: 'Pergunta: ler de novo ou corrigir.',
    },
    abandoned: {
        want_to_read: 'Volta a ser um desejo; a página fica guardada.',
        reading: 'Retoma a mesma leitura, da página em que parou.',
        read: 'Pede data de término e nota.',
    },
};

const ORDER: Status[] = ['want_to_read', 'reading', 'read', 'abandoned'];

/**
 * Shelf chip with a menu. Each option says what will happen;
 * the ones that need data open a panel instead of changing right away.
 */
export function StatusMenu({
    status,
    label,
    onPick,
}: {
    status: Status;
    label: string;
    onPick: (next: Status) => void;
}) {
    const [open, setOpen] = useState(false);
    const { t } = useTranslation();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onMouseDown(event: MouseEvent) {
            if (!ref.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    // A read book is not abandoned: whoever stops a reread abandons the reread.
    const options = ORDER.filter(
        (value) => !(status === 'read' && value === 'abandoned'),
    );

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className={cn(
                    'inline-flex h-10 items-center gap-2 rounded-full bg-elevated pr-3 pl-3.5 text-sm font-bold inset-ring hover:bg-active',
                    CHIP_RING[status],
                )}
            >
                <StatusIcon status={status} />
                {label}
                <svg
                    aria-hidden="true"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="text-muted"
                >
                    <path d="m3 4.5 3 3 3-3" />
                </svg>
            </button>
            {open && (
                <div
                    role="menu"
                    aria-label={t('Mudar estante')}
                    className="absolute top-12 left-0 z-30 flex w-82 flex-col gap-0.5 rounded-md bg-surface p-1.5 shadow-float"
                >
                    <span className="px-2.5 pt-1.5 pb-1 text-[11px] font-extrabold tracking-widest text-faint uppercase">
                        {t('mover para')}
                    </span>
                    {options.map((value) => {
                        const current = value === status;

                        return (
                            <button
                                key={value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={current}
                                onClick={() => {
                                    setOpen(false);

                                    if (!current) {
                                        onPick(value);
                                    }
                                }}
                                className={cn(
                                    'flex items-start gap-2.5 rounded-sm p-2.5 text-left hover:bg-active',
                                    current && 'bg-active',
                                )}
                            >
                                <span className="mt-0.75">
                                    <StatusIcon status={value} />
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="text-sm font-semibold">
                                        {t(STATUS_LABELS[value])}
                                    </span>
                                    <span
                                        className={cn(
                                            'text-xs leading-snug',
                                            current
                                                ? 'text-accent'
                                                : 'text-muted',
                                        )}
                                    >
                                        {current
                                            ? t('Está aqui.')
                                            : HINTS[status][value] &&
                                              t(HINTS[status][value])}
                                    </span>
                                </span>
                                {current && (
                                    <span className="font-mono text-[11px] text-accent">
                                        ●
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
