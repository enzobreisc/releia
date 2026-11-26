import { Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { IconButton } from '@/components/form';
import { CloseIcon } from '@/components/icons';
import { SidebarReadingCard } from '@/components/sidebar-reading';
import { useTranslation } from '@/hooks/use-translation';
import { isActive, navGroups } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

export function MobileMenuSheet({ onClose }: { onClose: () => void }) {
    const { url, props } = usePage();
    const { t } = useTranslation();

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end bg-bg/75 backdrop-blur-sm md:hidden"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('Mais')}
                className="flex max-h-[85dvh] w-full flex-col gap-5 overflow-y-auto rounded-t-lg border-t border-strong bg-elevated px-4.5 pt-5 pb-7"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-[17px] font-extrabold">{t('Mais')}</h2>
                    <IconButton
                        label={t('Fechar')}
                        variant="plain"
                        onClick={onClose}
                        className="size-11"
                    >
                        <CloseIcon width={18} height={18} />
                    </IconButton>
                </div>
                {props.reading_now && (
                    <SidebarReadingCard
                        reading={props.reading_now}
                        hasLiveSession={props.has_live_session}
                    />
                )}
                {navGroups.map((group, index) => (
                    <section
                        key={group.title ?? index}
                        className="flex flex-col gap-2"
                    >
                        {group.title && (
                            <h3 className="text-xs font-bold text-faint">
                                {t(group.title)}
                            </h3>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            {group.items.map((item) => (
                                <MenuLink
                                    key={item.href}
                                    item={item}
                                    active={isActive(url, item.href)}
                                    count={
                                        item.count
                                            ? props.counts[item.count]
                                            : undefined
                                    }
                                    onNavigate={onClose}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

function MenuLink({
    item,
    active,
    count,
    onNavigate,
}: {
    item: NavItem;
    active: boolean;
    count?: number;
    onNavigate: () => void;
}) {
    const { t } = useTranslation();

    return (
        <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex h-12 items-center gap-3 rounded-sm px-3 text-sm font-semibold inset-ring inset-ring-border',
                active ? 'bg-active font-bold text-white' : 'text-nav',
            )}
        >
            <item.icon
                width={18}
                height={18}
                strokeWidth={1.9}
                className={cn('shrink-0', active && 'text-accent')}
            />
            <span className="truncate">{t(item.title)}</span>
            {count !== undefined && (
                <span className="ml-auto font-mono text-[11px] font-normal text-faint">
                    {count}
                </span>
            )}
        </Link>
    );
}
