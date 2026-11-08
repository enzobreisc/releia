import { router } from '@inertiajs/react';
import { MenuItem, MenuSeparator, MoreMenu } from '@/components/menu';
import type { Status } from '@/components/status';
import type { DialogState } from '@/hooks/use-book-dialogs';
import { useTranslation } from '@/hooks/use-translation';
import { shopping as shoppingRoute } from '@/routes/books';
import type { ReadingHistory } from '@/types';

export function BookMenu({
    bookId,
    status,
    current,
    canMoveToShopping,
    onOpenDialog,
    onEdit,
}: {
    bookId: number;
    status: Status;
    current: ReadingHistory | null;
    canMoveToShopping: boolean;
    onOpenDialog: (dialog: DialogState) => void;
    onEdit: () => void;
}) {
    const { t } = useTranslation();

    return (
        <MoreMenu triggerClassName="size-12 text-lg text-text inset-ring inset-ring-strong">
            {(closeMenu) => (
                <>
                    <MenuItem
                        onClick={() => {
                            closeMenu();
                            onEdit();
                        }}
                        hint="⌘E"
                    >
                        {t('Editar dados do livro')}
                    </MenuItem>
                    {current && status !== 'want_to_read' && (
                        <MenuItem
                            onClick={() => {
                                closeMenu();
                                onOpenDialog({
                                    kind: 'dates',
                                    reading: current,
                                });
                            }}
                        >
                            {t('Editar datas da leitura')}
                        </MenuItem>
                    )}
                    {canMoveToShopping && (
                        <MenuItem
                            onClick={() => {
                                closeMenu();
                                router.post(shoppingRoute.url(bookId));
                            }}
                        >
                            {t('Mover para compras')}
                        </MenuItem>
                    )}
                    {status === 'read' && (
                        <MenuItem
                            onClick={() => {
                                closeMenu();
                                onOpenDialog({ kind: 'correct' });
                            }}
                        >
                            {t('Desmarcar como lido…')}
                        </MenuItem>
                    )}
                    <MenuSeparator />
                    <MenuItem
                        danger
                        onClick={() => {
                            closeMenu();
                            onOpenDialog({ kind: 'remove' });
                        }}
                    >
                        {t('Remover da biblioteca…')}
                    </MenuItem>
                </>
            )}
        </MoreMenu>
    );
}
