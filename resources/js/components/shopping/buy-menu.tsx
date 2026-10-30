import { router, usePage } from '@inertiajs/react';
import type { MouseEvent } from 'react';
import { buttonClass } from '@/components/form';
import { usePopover } from '@/hooks/use-popover';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { open as openShopping } from '@/routes/shopping';
import type { ShoppingEntry } from '@/types/queue';

/**
 * "Buy ▾": a ready-made search in each store. In the native app the link opens in the
 * browser through the server (the window does not open tabs); in the browser, in a new tab.
 * With `fitToParent`, the menu spans the nearest positioned ancestor (see MoreMenu).
 */
export function BuyMenu({
    item,
    fitToParent = false,
    className,
}: {
    item: ShoppingEntry;
    fitToParent?: boolean;
    className?: string;
}) {
    const { native } = usePage().props;
    const { t } = useTranslation();
    const popover = usePopover();

    function openLink(event: MouseEvent<HTMLAnchorElement>, store?: string) {
        popover.close();

        if (native) {
            event.preventDefault();
            router.post(openShopping.url(item.id), store ? { store } : {}, {
                preserveScroll: true,
            });
        }
    }

    const entries = [
        ...(item.saved_link
            ? [
                  {
                      key: 'saved',
                      label: t('Link salvo'),
                      url: item.saved_link,
                      store: undefined,
                  },
              ]
            : []),
        ...item.stores.map((store) => ({ ...store, store: store.key })),
    ];

    return (
        <div
            ref={popover.ref}
            className={cn(fitToParent ? 'static' : 'relative', className)}
        >
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={popover.isOpen}
                onClick={popover.toggle}
                className={buttonClass('ghost', 'h-10 w-full px-4 text-[13px]')}
            >
                {t('Comprar')} {popover.isOpen ? '▴' : '▾'}
            </button>
            {popover.isOpen && (
                <ul
                    role="menu"
                    className={cn(
                        'absolute top-full z-30 mt-1 rounded-sm bg-surface p-1 shadow-float',
                        fitToParent ? 'inset-x-0' : 'left-0 w-60',
                    )}
                >
                    {entries.map((entry) => (
                        <li key={entry.key} role="none">
                            <a
                                role="menuitem"
                                href={entry.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) =>
                                    openLink(event, entry.store)
                                }
                                className="flex items-center justify-between rounded-[8px] px-3 py-2 text-[13px] font-semibold text-text hover:bg-elevated"
                            >
                                {entry.label}
                                <span className="text-muted">↗</span>
                            </a>
                        </li>
                    ))}
                    <li
                        role="none"
                        className="px-3 pt-1 pb-1.5 text-[11px] leading-snug text-faint"
                    >
                        {item.isbn
                            ? t('Busca pelo ISBN da edição.')
                            : t('Sem ISBN: busca por título e autor.')}
                    </li>
                </ul>
            )}
        </div>
    );
}
