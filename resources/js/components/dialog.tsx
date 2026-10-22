import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Confirmation or data dialog (replaces the native confirm()).
 * Markdown title ("## remove book?"); Esc and clicking outside close it without doing anything.
 * Initial focus goes to the element with autoFocus: on destructive actions, Cancel.
 */
export function Dialog({
    title,
    onClose,
    children,
    className,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}) {
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(3,6,10,0.72)] px-4 pt-[12vh] pb-8"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title.replace(/^#+\s*/, '')}
                className={cn(
                    'flex w-full max-w-125 flex-col gap-3.5 rounded-xl border border-strong bg-surface p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)]',
                    className,
                )}
            >
                <h2 className="font-mono text-base font-bold">{title}</h2>
                {children}
            </div>
        </div>
    );
}

/** "What goes with it" list of a destructive dialog. */
export function DialogList({ items }: { items: string[] }) {
    return (
        <ul className="flex flex-col gap-1 rounded-sm bg-bg px-3 py-2.5 font-mono text-xs text-nav">
            {items.map((item) => (
                <li key={item}>{item}</li>
            ))}
        </ul>
    );
}

/** Large option of a choice dialog (e.g. "Read again" or "Fix"). */
export function DialogChoice({
    title,
    badge,
    description,
    onClick,
    recommended = false,
    autoFocus = false,
}: {
    title: string;
    badge?: string;
    description: string;
    onClick: () => void;
    recommended?: boolean;
    autoFocus?: boolean;
}) {
    return (
        <button
            type="button"
            autoFocus={autoFocus}
            onClick={onClick}
            className={cn(
                'flex flex-col gap-1 rounded-md border px-4 py-3.5 text-left',
                recommended
                    ? 'border-primary bg-active hover:bg-active/80'
                    : 'hover:bg-active',
            )}
        >
            <span className="text-sm font-semibold">
                {title}{' '}
                {badge && (
                    <span className="font-mono text-[11px] font-medium text-accent">
                        {badge}
                    </span>
                )}
            </span>
            <span className="text-[13px] leading-snug text-nav">
                {description}
            </span>
        </button>
    );
}
