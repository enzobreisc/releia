import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { MobileMenuSheet } from '@/components/mobile-menu-sheet';
import { MoreIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import { isActive, tabBarItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

const TAB_CLASS =
    'flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-sm text-[11px] font-bold';

/** The most specific tab wins, so "Adicionar" beats "Biblioteca" on the add-book page. */
function activeTabHref(currentUrl: string): string | null {
    const matches = tabBarItems
        .filter((item) => isActive(currentUrl, item.href))
        .sort((first, second) => second.href.length - first.href.length);

    return matches[0]?.href ?? null;
}

export function MobileTabBar() {
    const { url } = usePage();
    const { t } = useTranslation();
    const [menuUrl, setMenuUrl] = useState<string | null>(null);
    const activeHref = activeTabHref(url);
    const isMenuOpen = menuUrl === url;

    return (
        <>
            <nav
                aria-label={t('Principal')}
                className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-sidebar px-1 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
            >
                {tabBarItems.map((item) => (
                    <TabLink
                        key={item.href}
                        item={item}
                        active={item.href === activeHref}
                    />
                ))}
                <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={isMenuOpen}
                    onClick={() => setMenuUrl(url)}
                    className={cn(
                        TAB_CLASS,
                        activeHref === null ? 'text-text' : 'text-muted',
                    )}
                >
                    <MoreIcon
                        width={18}
                        height={18}
                        strokeWidth={1.9}
                        className={cn(activeHref === null && 'text-accent')}
                    />
                    {t('Mais')}
                </button>
            </nav>
            {isMenuOpen && <MobileMenuSheet onClose={() => setMenuUrl(null)} />}
        </>
    );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
    const { t } = useTranslation();

    return (
        <Link
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(TAB_CLASS, active ? 'text-text' : 'text-muted')}
        >
            <item.icon
                width={18}
                height={18}
                strokeWidth={1.9}
                className={cn(active && 'text-accent')}
            />
            {t(item.title)}
        </Link>
    );
}
