import { cn } from '@/lib/utils';

/** Nota de 1 a 5. Clicar na nota atual apaga a nota. */
export function StarRating({
    value,
    onChange,
    disabled,
}: {
    value: number | null;
    onChange: (value: number | null) => void;
    disabled?: boolean;
}) {
    return (
        <div role="radiogroup" aria-label="Sua nota" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={value === star}
                    aria-label={`${star} de 5`}
                    disabled={disabled}
                    onClick={() => onChange(value === star ? null : star)}
                    className="rounded-sm p-0.5 hover:bg-active"
                >
                    <svg
                        aria-hidden="true"
                        width="28"
                        height="28"
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
