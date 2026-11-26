import { cn } from '@/lib/utils';

export function Switch({
    checked,
    disabled = false,
    labelledBy,
    describedBy,
    onCheckedChange,
}: {
    checked: boolean;
    disabled?: boolean;
    labelledBy: string;
    describedBy?: string;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60',
                checked ? 'bg-accent' : 'bg-strong',
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'absolute top-0.5 left-0.5 size-5 rounded-full bg-text transition-transform',
                    checked && 'translate-x-5',
                )}
            />
        </button>
    );
}
