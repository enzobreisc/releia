import type { ReactNode } from 'react';
import { IconButton } from '@/components/form';
import { usePopover } from '@/hooks/use-popover';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/**
 * "⋯" button opening a menu of secondary actions. With `fitToParent`, the menu spans
 * the nearest positioned ancestor, for narrow spots where a wide menu would be clipped.
 */
export function MoreMenu({
    label,
    triggerClassName,
    fitToParent = false,
    children,
}: {
    label?: string;
    triggerClassName?: string;
    fitToParent?: boolean;
    children: (close: () => void) => ReactNode;
}) {
    const { t } = useTranslation();
    const popover = usePopover();

    return (
        <div ref={popover.ref} className={fitToParent ? 'static' : 'relative'}>
            <IconButton
                label={label ?? t('Mais ações')}
                aria-haspopup="menu"
                aria-expanded={popover.isOpen}
                onClick={popover.toggle}
                className={triggerClassName}
            >
                ⋯
            </IconButton>
            {popover.isOpen && (
                <div
                    role="menu"
                    className={cn(
                        'absolute top-full z-30 mt-2.5 flex flex-col rounded-[16px] bg-elevated p-1.5 shadow-float inset-ring inset-ring-strong',
                        fitToParent ? 'inset-x-0' : 'right-0 w-67.5',
                    )}
                >
                    {children(popover.close)}
                </div>
            )}
        </div>
    );
}

export function MenuItem({
    children,
    onClick,
    hint,
    danger = false,
}: {
    children: string;
    onClick: () => void;
    hint?: string;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={cn(
                'flex h-11 items-center justify-between rounded-[10px] px-3 text-left text-sm font-semibold',
                danger
                    ? 'text-danger hover:bg-danger-fill/15'
                    : 'text-text hover:bg-active',
            )}
        >
            {children}
            {hint && (
                <span className="font-mono text-[11px] font-normal text-muted">
                    {hint}
                </span>
            )}
        </button>
    );
}

export function MenuSeparator() {
    return <div role="separator" className="mx-2 my-1 h-px bg-strong" />;
}
