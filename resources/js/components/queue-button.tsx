import { router } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { store } from '@/routes/queue';
import { destroy as removeBook } from '@/routes/queue/books';

/**
 * Alterna o livro na fila. Fora dela: "+ fila" põe no fim. Dentro: mostra a
 * posição ("na fila · 2º") e clicar tira da fila; o aviso oferece desfazer.
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
    const queued = position !== null;

    return (
        <button
            type="button"
            aria-pressed={queued}
            title={queued ? 'Tirar da fila' : 'Pôr no fim da fila'}
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
                'h-9 self-start rounded-sm border px-3 text-[13px]',
                queued
                    ? 'border-strong bg-active text-nav hover:text-text'
                    : 'bg-surface text-accent hover:bg-active',
                className,
            )}
        >
            {queued ? `na fila · ${position}º` : '+ fila'}
        </button>
    );
}
