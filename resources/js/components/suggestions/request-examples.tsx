import { useTranslation } from '@/hooks/use-translation';
import { REQUEST_EXAMPLES } from './request-constants';

export function RequestExamples({
    isDisabled,
    onPick,
}: {
    isDisabled: boolean;
    onPick: (example: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap gap-2">
            {REQUEST_EXAMPLES.map((example) => (
                <button
                    key={example}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => onPick(example)}
                    className="h-9 rounded-full px-3.5 text-[13px] font-semibold text-secondary inset-ring inset-ring-strong hover:bg-elevated disabled:opacity-60"
                >
                    {t(example)}
                </button>
            ))}
        </div>
    );
}
