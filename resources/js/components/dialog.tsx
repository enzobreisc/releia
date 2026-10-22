import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Confirmation or data dialog (replaces the native confirm()).
 * Titles may still carry the old "## " prefix, which is not shown.
 * Esc and clicking outside close it without doing anything.
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
    const heading = title.replace(/^#+\s*/, '');

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
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/75 px-4 pt-[12vh] pb-8 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={heading}
                className={cn(
                    'flex w-full max-w-125 flex-col gap-4 rounded-lg bg-surface p-6 shadow-float',
                    className,
                )}
            >
                <h2 className="text-xl font-extrabold tracking-tight first-letter:uppercase">
                    {heading}
                </h2>
                {children}
            </div>
        </div>
    );
}

/** "What goes with it" list of a destructive dialog. */
export function DialogList({ items }: { items: string[] }) {
    return (
        <ul className="flex flex-col gap-1 rounded-sm bg-bg px-3.5 py-3 font-mono text-xs text-secondary inset-ring inset-ring-border">
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
                'flex flex-col gap-1 rounded-md px-4 py-3.5 text-left inset-ring',
                recommended
                    ? 'bg-active inset-ring-primary hover:bg-elevated'
                    : 'inset-ring-strong hover:bg-active',
            )}
        >
            <span className="text-sm font-extrabold">
                {title}{' '}
                {badge && (
                    <span className="font-mono text-[11px] font-medium text-link">
                        {badge}
                    </span>
                )}
            </span>
            <span className="text-[13px] leading-snug font-medium text-secondary">
                {description}
            </span>
        </button>
    );
}
