import { router } from '@inertiajs/react';
import { MenuItem, MenuSeparator, MoreMenu } from '@/components/menu';
import { useTranslation } from '@/hooks/use-translation';
import {
    buy,
    destroy as destroyShopping,
    price as lookupPrice,
    unbuy,
} from '@/routes/shopping';
import type { ShoppingEntry } from '@/types/queue';

/** Secondary actions of a shopping item, behind "⋯". */
export function ItemMenu({
    item,
    fitToParent = false,
}: {
    item: ShoppingEntry;
    fitToParent?: boolean;
}) {
    const { t } = useTranslation();

    function post(url: string) {
        router.post(url, {}, { preserveScroll: true });
    }

    return (
        <MoreMenu
            label={t('Mais ações para :title', { title: item.title })}
            fitToParent={fitToParent}
        >
            {(closeMenu) => (
                <>
                    {item.bought ? (
                        <MenuItem
                            onClick={() => {
                                closeMenu();
                                post(unbuy.url(item.id));
                            }}
                        >
                            {t('Desmarcar compra')}
                        </MenuItem>
                    ) : (
                        <MenuItem
                            onClick={() => {
                                closeMenu();
                                post(buy.url(item.id));
                            }}
                        >
                            {t('Marcar como comprado')}
                        </MenuItem>
                    )}
                    {!item.bought && item.isbn && (
                        <MenuItem
                            hint={t('Estante Virtual')}
                            onClick={() => {
                                closeMenu();
                                post(lookupPrice.url(item.id));
                            }}
                        >
                            {t('Buscar preço')}
                        </MenuItem>
                    )}
                    <MenuSeparator />
                    <MenuItem
                        danger
                        onClick={() => {
                            closeMenu();
                            router.delete(destroyShopping.url(item.id), {
                                preserveScroll: true,
                            });
                        }}
                    >
                        {t('Excluir')}
                    </MenuItem>
                </>
            )}
        </MoreMenu>
    );
}
