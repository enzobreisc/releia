import { router } from '@inertiajs/react';
import { store } from '@/routes/queue';

/** Põe o livro no fim da fila. Idempotente no servidor, então clicar de novo não duplica. */
export function QueueButton({
    bookId,
    queued = false,
    className,
}: {
    bookId: number;
    queued?: boolean;
    className?: string;
}) {
    if (queued) {
        return (
            <span
                className={
                    className ??
                    'self-start rounded-[10px] bg-elevated px-2 py-0.5 font-mono text-[11px] text-muted'
                }
            >
                na fila
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={() =>
                router.post(
                    store.url(),
                    { book_id: bookId },
                    { preserveScroll: true },
                )
            }
            className={
                className ??
                'h-9 self-start rounded-sm border bg-surface px-3 text-[13px] text-accent hover:bg-active'
            }
        >
            + fila
        </button>
    );
}
