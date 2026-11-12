import { cn } from '@/lib/utils';

export function Chip({
    label,
    selected,
    onClick,
    tone = 'blue',
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
    tone?: 'blue' | 'warn';
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                'h-9 rounded-full px-3.5 text-[13px] font-bold inset-ring',
                selected
                    ? tone === 'warn'
                        ? 'bg-warn-fill text-warn inset-ring-warn'
                        : 'bg-active text-text inset-ring-primary'
                    : 'text-secondary inset-ring-strong hover:bg-active',
            )}
        >
            {label}
        </button>
    );
}
