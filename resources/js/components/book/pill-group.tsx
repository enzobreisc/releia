import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PillGroup({
    role,
    label,
    children,
}: {
    role: 'radiogroup' | 'tablist';
    label: string;
    children: ReactNode;
}) {
    return (
        <div
            role={role}
            aria-label={label}
            className="flex flex-wrap self-start rounded-full bg-surface p-1 inset-ring inset-ring-border"
        >
            {children}
        </div>
    );
}

export function PillOption({
    role,
    selected,
    onClick,
    className,
    children,
}: {
    role: 'radio' | 'tab';
    selected: boolean;
    onClick: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            role={role}
            aria-checked={role === 'radio' ? selected : undefined}
            aria-selected={role === 'tab' ? selected : undefined}
            onClick={onClick}
            className={cn(
                'flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold',
                role === 'tab'
                    ? selected
                        ? 'bg-text text-bg'
                        : 'text-secondary hover:text-text'
                    : selected
                      ? 'bg-active text-white'
                      : 'text-muted hover:text-text',
                className,
            )}
        >
            {children}
        </button>
    );
}
