import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { ShelfGroup } from '@/types';

export function GroupChip({
    group,
    selected,
    onToggle,
}: {
    group: ShelfGroup;
    selected: boolean;
    onToggle: () => void;
}) {
    const { translateText } = useTranslation();

    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onToggle}
            className={cn(
                'flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-bold',
                selected
                    ? 'bg-text text-bg'
                    : 'bg-surface text-secondary inset-ring inset-ring-border hover:bg-elevated hover:text-text',
            )}
        >
            {translateText(group.label)}
            <span className="font-mono text-[11px] font-normal opacity-75">
                {group.count}
            </span>
        </button>
    );
}
