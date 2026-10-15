import { Link, usePage } from '@inertiajs/react';
import { Fragment } from 'react';
import { LogoMark, SearchIcon, SidebarIcon } from '@/components/icons';
import { SidebarReadingCard } from '@/components/sidebar-reading';
import { addBookItem, isActive, navGroups } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

type AppSidebarProps = {
    collapsed: boolean;
    onToggle: () => void;
    onOpenCommand: () => void;
};

export function AppSidebar({
    collapsed,
    onToggle,
    onOpenCommand,
}: AppSidebarProps) {
    const { url, props } = usePage();

    return (
        <nav
            aria-label="Principal"
            className={cn(
                'flex h-screen shrink-0 flex-col gap-0.5 overflow-y-auto border-r bg-sidebar pb-4',
                collapsed ? 'w-14 px-2' : 'w-61 px-3.5',
            )}
        >
            {/* Faixa arrastável sob os botões de janela do macOS. */}
            <div className="h-9 shrink-0 app-drag" />

            <div
                className={cn(
                    'flex items-center gap-2.5 pb-4.5',
                    collapsed ? 'justify-center' : 'px-3',
                )}
            >
                <LogoMark />
                {!collapsed && (
                    <span className="font-mono text-lg font-bold">releia</span>
                )}
            </div>

            <button
                type="button"
                onClick={onOpenCommand}
                aria-label="Ir para (⌘P)"
                title="Ir para… (⌘P)"
                className={cn(
                    'mb-3.5 flex h-10 items-center gap-2 rounded-sm border bg-bg text-left text-[13px] text-muted hover:text-text',
                    collapsed ? 'justify-center' : 'px-3',
                )}
            >
                <SearchIcon />
                {!collapsed && (
                    <>
                        <span className="flex-1">Ir para…</span>
                        <Kbd>⌘P</Kbd>
                    </>
                )}
            </button>

            {navGroups.map((group, index) => (
                <Fragment key={index}>
                    {index > 0 && (
                        <div className="mx-2 my-2.5 h-px bg-border" />
                    )}
                    {group.map((item) => (
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
                aria-label={addBookItem.title}
                title={addBookItem.title}
                className={cn(
                    'mt-2 flex items-center gap-2 rounded-sm bg-primary py-3.25 text-sm font-semibold text-white hover:bg-primary/90',
                    collapsed ? 'justify-center' : 'px-3',
                )}
            >
                <addBookItem.icon />
                {!collapsed && <span>{addBookItem.title}</span>}
            </Link>

            <button
                type="button"
                onClick={onToggle}
                aria-label={
                    collapsed
                        ? 'Expandir barra lateral'
                        : 'Recolher barra lateral'
                }
                title={`${collapsed ? 'Expandir' : 'Recolher'} barra lateral (⌘B)`}
                className={cn(
                    'mt-1.5 flex h-10 items-center gap-2.5 rounded-sm text-left text-[13px] text-muted hover:text-text',
                    collapsed ? 'justify-center' : 'px-3',
                )}
            >
                <SidebarIcon />
                {!collapsed && <span>Recolher</span>}
            </button>
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
    return (
        <Link
            href={item.href}
            aria-label={item.title}
            aria-current={active ? 'page' : undefined}
            title={item.title}
            className={cn(
                'flex items-center gap-2.5 rounded-sm border-l-2 py-3 text-sm',
                collapsed ? 'justify-center' : 'px-3',
                active
                    ? 'border-primary bg-active font-semibold text-text'
                    : 'border-transparent text-nav hover:bg-active/60 hover:text-text',
            )}
        >
            <item.icon />
            {!collapsed && <span>{item.title}</span>}
            {!collapsed && count !== undefined && (
                <span className="ml-auto font-mono text-[11px] font-normal text-faint">
                    {count}
                </span>
            )}
        </Link>
    );
}

export function Kbd({ children }: { children: string }) {
    return (
        <kbd className="rounded-[4px] border px-1.5 py-0.5 font-mono text-[11px] text-muted">
            {children}
        </kbd>
    );
}
