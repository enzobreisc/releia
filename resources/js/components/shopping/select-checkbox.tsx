import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export function SelectCheckbox({
    title,
    isSelected,
    onToggle,
}: {
    title: string;
    isSelected: boolean;
    onToggle: () => void;
}) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            aria-label={t('Selecionar :title', { title })}
            onClick={onToggle}
            className={cn(
                'size-6.5 shrink-0 rounded-[8px] text-sm font-extrabold text-bg inset-ring-[1.5px]',
                isSelected
                    ? 'bg-text inset-ring-text'
                    : 'bg-transparent inset-ring-strong hover:inset-ring-secondary',
            )}
        >
            {isSelected && '✓'}
        </button>
    );
}
