import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { undo } from '@/routes';
import type { Toast } from '@/types';

/** No máximo três avisos na tela; o mais antigo sai primeiro. */
const MAX_VISIBLE = 3;

/** ⌘Z desfaz a última ação desfazível por até um minuto (UndoService::TTL_SECONDS). */
const UNDO_WINDOW_MS = 60_000;

let lastUndo: { token: string; at: number } | null = null;

function runUndo(token: string) {
    lastUndo = null;
    router.post(undo(token).url, {}, { preserveScroll: true });
}

function isEditable(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    );
}

/**
 * Avisos das ações (App\Support\Toast). `corner` fica no canto inferior direito
 * da janela; `bar` é a faixa da janela da barra de menu, acima do rodapé.
 */
export function Toaster({
    variant = 'corner',
}: {
    variant?: 'corner' | 'bar';
}) {
    const toast = usePage().props.toast;
    const [items, setItems] = useState<Toast[]>([]);
    const [seen, setSeen] = useState<string | null>(null);

    // Cada aviso novo do servidor entra uma vez na pilha. Só a última ação se desfaz:
    // qualquer ação nova (aviso de sucesso) tira o desfazer dos avisos anteriores.
    if (toast && toast.id !== seen) {
        const supersedes = toast.kind === 'success';

        setSeen(toast.id);
        setItems((list) =>
            [
                ...(supersedes
                    ? list.map((item) => ({ ...item, undo: null }))
                    : list),
                toast,
            ].slice(-MAX_VISIBLE),
        );

        if (supersedes) {
            lastUndo = toast.undo
                ? { token: toast.undo, at: Date.now() }
                : null;
        }
    }

    function dismiss(id: string) {
        setItems((list) => list.filter((item) => item.id !== id));
    }

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            const key = event.key.toLowerCase();

            if (
                key === 'z' &&
                event.metaKey &&
                !event.shiftKey &&
                !isEditable(event.target) &&
                lastUndo !== null &&
                Date.now() - lastUndo.at < UNDO_WINDOW_MS
            ) {
                event.preventDefault();
                runUndo(lastUndo.token);
            }

            // Esc fecha o aviso mais recente, mas não briga com diálogos e menus abertos.
            if (
                key === 'escape' &&
                !document.querySelector('[role="dialog"], [role="menu"]')
            ) {
                setItems((list) => list.slice(0, -1));
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    if (items.length === 0) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            className={cn(
                'z-60 flex flex-col gap-2',
                variant === 'corner'
                    ? 'fixed right-6 bottom-6 w-95 max-w-[calc(100vw-48px)]'
                    : 'fixed inset-x-3 bottom-9',
            )}
        >
            {items.map((item) => (
                <ToastItem
                    key={item.id}
                    toast={item}
                    compact={variant === 'bar'}
                    onClose={() => dismiss(item.id)}
                />
            ))}
        </div>
    );
}

function ToastItem({
    toast,
    compact,
    onClose,
}: {
    toast: Toast;
    compact: boolean;
    onClose: () => void;
}) {
    const [hovered, setHovered] = useState(false);
    const error = toast.kind === 'error';

    function act() {
        const action = toast.action;

        if (!action) {
            return;
        }

        onClose();
        router.visit(action.url, {
            method: action.method,
            data: action.data ?? {},
            preserveScroll: action.method !== 'get',
        });
    }

    const button =
        'h-8 shrink-0 rounded-sm border border-strong px-2.5 text-xs font-semibold text-accent hover:bg-active';

    return (
        <div
            role={error ? 'alert' : 'status'}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
                'relative flex animate-[toast-in_180ms_ease-out] flex-col gap-2 overflow-hidden rounded-md border bg-elevated py-3 pr-2.5 pl-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.5)]',
                error ? 'border-danger-line' : 'border-strong',
            )}
        >
            <div className="flex items-start gap-2.5">
                <span
                    aria-hidden="true"
                    className={cn(
                        'mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        error
                            ? 'bg-[#3a1a1e] text-danger'
                            : 'bg-heat-1 text-accent',
                    )}
                >
                    {error ? '!' : '✓'}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[13px] font-semibold">
                        {toast.title}
                    </span>
                    {toast.sub && (
                        <span
                            className={cn(
                                'font-mono text-[11px] text-muted',
                                compact ? 'truncate' : 'line-clamp-2',
                            )}
                        >
                            {toast.sub}
                        </span>
                    )}
                </span>
                <button
                    type="button"
                    aria-label="Fechar aviso"
                    onClick={onClose}
                    className="-mt-1 size-7 shrink-0 rounded-[5px] text-[15px] text-muted hover:bg-active hover:text-text"
                >
                    ×
                </button>
            </div>
            {/* Botões numa linha própria: o título nunca fica espremido. */}
            {(toast.action || toast.undo) && (
                <div className="flex flex-wrap justify-end gap-1.5 pr-1">
                    {toast.action && (
                        <button type="button" onClick={act} className={button}>
                            {toast.action.label}
                        </button>
                    )}
                    {toast.undo && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                runUndo(toast.undo!);
                            }}
                            className={button}
                        >
                            Desfazer{compact ? '' : ' ⌘Z'}
                        </button>
                    )}
                </div>
            )}
            {/* O tempo é a própria animação: pausa com o mouse em cima; erro não some sozinho. */}
            {!error && (
                <span
                    aria-hidden="true"
                    onAnimationEnd={onClose}
                    style={{
                        animationPlayState: hovered ? 'paused' : 'running',
                    }}
                    className="absolute bottom-0 left-0 h-0.5 animate-[toast-timer_6s_linear_forwards] bg-primary"
                />
            )}
        </div>
    );
}
