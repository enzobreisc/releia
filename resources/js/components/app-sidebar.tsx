import { Link, usePage } from '@inertiajs/react';
import { Fragment } from 'react';
import { IconButton } from '@/components/form';
import {
    LogoMark,
    SidebarCollapseIcon,
    SidebarExpandIcon,
} from '@/components/icons';
import { SidebarReadingCard } from '@/components/sidebar-reading';
import { useTranslation } from '@/hooks/use-translation';
import { addBookItem, isActive, navGroups } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import type { NavItem } from '@/types';

type AppSidebarProps = {
    collapsed: boolean;
    onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
    const { url, props } = usePage();
    const { t } = useTranslation();

    return (
        <nav
            aria-label={t('Principal')}
            className={cn(
                'flex h-screen shrink-0 flex-col gap-0.5 overflow-x-hidden overflow-y-auto border-r border-active/60 bg-sidebar pb-4 transition-[width,padding] duration-200 ease-out motion-reduce:transition-none',
                collapsed ? 'w-14 px-2' : 'w-61 px-3.5',
            )}
        >
            {/* Draggable strip under the macOS window buttons. */}
            <div className="h-9 shrink-0 app-drag" />

            <div
                className={cn(
                    'mb-5 flex items-center',
                    collapsed
                        ? 'flex-col gap-3'
                        : 'justify-between pr-0.5 pl-3',
                )}
            >
                <Link
                    href={home.url()}
                    aria-label={t('releia: ir para o Início')}
                    title={t('Início')}
                    className="flex items-center gap-2.5 rounded-sm"
                >
                    <LogoMark size={22} />
                    {!collapsed && (
                        <span className="font-brand text-[17px] font-bold">
                            releia
                        </span>
                    )}
                </Link>

                <IconButton
                    label={
                        collapsed
                            ? t('Expandir barra lateral')
                            : t('Recolher barra lateral')
                    }
                    title={
                        collapsed
                            ? t('Expandir barra lateral (⌘B)')
                            : t('Recolher barra lateral (⌘B)')
                    }
                    variant="plain"
                    aria-expanded={!collapsed}
                    onClick={onToggle}
                    className="size-8 app-no-drag"
                >
                    {collapsed ? (
                        <SidebarExpandIcon />
                    ) : (
                        <SidebarCollapseIcon />
                    )}
                </IconButton>
            </div>

            {navGroups.map((group, index) => (
                <Fragment key={group.title ?? index}>
                    {group.title &&
                        (collapsed ? (
                            <div className="mx-2 my-2.5 h-px bg-border" />
                        ) : (
                            <span className="px-3 pt-4.5 pb-1.5 text-xs font-bold text-faint">
                                {t(group.title)}
                            </span>
                        ))}
                    {group.items.map((item) => (
                        <SidebarLink
                            key={item.href}
                            item={item}
                            active={isActive(url, item.href)}
                            collapsed={collapsed}
                            count={
                                item.count
                                    ? props.counts[item.count]
                                    : undefined
                            }
                        />
                    ))}
                </Fragment>
            ))}

            <div className="min-h-4 flex-1" />

            {!collapsed && props.reading_now && (
                <SidebarReadingCard reading={props.reading_now} />
            )}

            <Link
                href={addBookItem.href}
                aria-label={t(addBookItem.title)}
                title={t(addBookItem.title)}
                className={cn(
                    'mt-2 flex items-center justify-center gap-2 rounded-full bg-elevated text-sm font-bold text-text inset-ring inset-ring-strong hover:bg-active',
                    collapsed ? 'size-10 self-center' : 'h-11 px-3',
                )}
            >
                <addBookItem.icon strokeWidth={2} />
                {!collapsed && <span>{t(addBookItem.title)}</span>}
            </Link>
        </nav>
    );
}

function SidebarLink({
    item,
    active,
    collapsed,
    count,
}: {
    item: NavItem;
    active: boolean;
    collapsed: boolean;
    count?: number;
}) {
    const { t } = useTranslation();

    return (
        <Link
            href={item.href}
            aria-label={t(item.title)}
            aria-current={active ? 'page' : undefined}
            title={t(item.title)}
            className={cn(
                'group flex h-10.5 items-center gap-3 rounded-sm text-sm',
                collapsed ? 'justify-center' : 'px-3',
                active
                    ? 'bg-active font-bold text-white'
                    : 'font-semibold text-nav hover:bg-active/60 hover:text-text',
            )}
        >
            <item.icon
                width={18}
                height={18}
                strokeWidth={1.9}
                className={cn('shrink-0', active && 'text-accent')}
            />
            {!collapsed && <span>{t(item.title)}</span>}
            {!collapsed && count !== undefined && (
                <span
                    className={cn(
                        'ml-auto font-mono text-[11px] font-normal',
                        active ? 'text-muted' : 'text-faint',
                    )}
                >
                    {count}
                </span>
            )}
        </Link>
    );
}

export function Kbd({ children }: { children: string }) {
    return <kbd className="font-mono text-[11px] text-muted">{children}</kbd>;
}
