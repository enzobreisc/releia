import { router } from '@inertiajs/react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { merge } from '@/routes/bookshelves';
import type { BookcaseShelf } from '@/types';

export function MergeShelfDialog({
    shelf,
    others,
    onClose,
}: {
    shelf: { id: number; name: string };
    /** Shelves that can be absorbed into `shelf`. */
    others: BookcaseShelf[];
    onClose: () => void;
}) {
    const { t, translateText } = useTranslation();

    function absorb(other: BookcaseShelf) {
        router.post(
            merge.url(shelf.id),
            { absorbed_id: other.id },
            { preserveScroll: true, onSuccess: onClose },
        );
    }

    return (
        <Dialog
            title={t('Unir com :name', { name: translateText(shelf.name) })}
            onClose={onClose}
        >
            <p className="text-[13px] font-medium text-secondary">
                {t(
                    'Os livros da prateleira escolhida passam para esta, e os próximos livros do mesmo grupo também.',
                )}
            </p>
            <div className="flex flex-col gap-2">
                {others.map((other) => (
                    <button
                        key={other.id}
                        type="button"
                        onClick={() => absorb(other)}
                        className="flex h-12 items-center rounded-md px-4 text-left text-sm font-bold inset-ring inset-ring-strong hover:bg-active"
                    >
                        {translateText(other.name)}
                    </button>
                ))}
            </div>
            <div className="flex justify-end">
                <Button variant="ghost" autoFocus onClick={onClose}>
                    {t('Cancelar')}
                </Button>
            </div>
        </Dialog>
    );
}
