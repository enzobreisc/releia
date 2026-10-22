import { router } from '@inertiajs/react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { store } from '@/routes/queue';
import { destroy as removeBook } from '@/routes/queue/books';

/**
 * Toggles the book in the queue. Outside it: "+ queue" puts it at the end. Inside: shows the
 * position ("in queue · 2nd") and clicking removes it; the notice offers undo.
 */
export function QueueButton({
    bookId,
    position,
    className,
}: {
    bookId: number;
    position: number | null;
    className?: string;
}) {
    const { t, ordinal } = useTranslation();
    const queued = position !== null;

    return (
        <button
            type="button"
            aria-pressed={queued}
            title={queued ? t('Tirar da fila') : t('Pôr no fim da fila')}
            onClick={() =>
                queued
                    ? router.delete(removeBook(bookId).url, {
                          preserveScroll: true,
                      })
                    : router.post(
                          store.url(),
                          { book_id: bookId },
                          { preserveScroll: true },
                      )
            }
            className={cn(
                'h-9 self-start rounded-full px-3.5 text-xs font-bold',
                queued
                    ? 'bg-active text-link hover:text-text'
                    : 'bg-elevated text-secondary inset-ring inset-ring-strong hover:text-text',
                className,
            )}
        >
            {queued
                ? t('na fila · :position', { position: ordinal(position) })
                : t('+ fila')}
        </button>
    );
}
