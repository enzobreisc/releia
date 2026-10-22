import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

/** Rating from 1 to 5. Clicking the current rating clears it. */
export function StarRating({
    value,
    onChange,
    disabled,
    size = 28,
}: {
    value: number | null;
    onChange: (value: number | null) => void;
    disabled?: boolean;
    size?: number;
}) {
    const { t } = useTranslation();

    return (
        <div
            role="radiogroup"
            aria-label={t('Sua nota')}
            className="flex gap-1"
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={value === star}
                    aria-label={t(':star de 5', { star })}
                    disabled={disabled}
                    onClick={() => onChange(value === star ? null : star)}
                    className="rounded-sm p-0.5 hover:bg-active"
                >
                    <svg
                        aria-hidden="true"
                        width={size}
                        height={size}
                        viewBox="0 0 24 24"
                    >
                        <polygon
                            points="12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9"
                            className={cn(
                                'stroke-primary',
                                value !== null && star <= value
                                    ? 'fill-primary'
                                    : 'fill-none',
                            )}
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            ))}
        </div>
    );
}
