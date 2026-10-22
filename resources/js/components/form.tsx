import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Option } from '@/types';

const controlClass =
    'w-full border-0 bg-surface px-4.5 text-sm font-semibold text-text inset-ring inset-ring-border placeholder:font-medium placeholder:text-faint focus:inset-ring-primary focus:outline-none disabled:opacity-60';

export function Field({
    label,
    error,
    className,
    children,
}: {
    label: ReactNode;
    error?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <label
            className={cn(
                'flex min-w-0 flex-col gap-1.5 text-xs font-bold text-muted',
                className,
            )}
        >
            <span>{label}</span>
            {children}
            {error && (
                <span className="text-xs font-semibold text-danger">
                    {error}
                </span>
            )}
        </label>
    );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
    return (
        <input
            className={cn(controlClass, 'h-11 rounded-full', className)}
            {...props}
        />
    );
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
    return (
        <select
            className={cn(controlClass, 'h-11 rounded-full', className)}
            {...props}
        />
    );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
    return (
        <textarea
            className={cn(
                controlClass,
                'min-h-28 resize-y rounded-md py-3.5 leading-relaxed font-medium',
                className,
            )}
            {...props}
        />
    );
}

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

const buttonVariants: Record<ButtonVariant, string> = {
    primary: 'bg-text font-extrabold text-bg hover:bg-white',
    outline:
        'bg-active font-bold text-text inset-ring inset-ring-primary hover:bg-elevated',
    ghost: 'bg-elevated font-bold text-text inset-ring inset-ring-strong hover:bg-active',
    danger: 'bg-transparent font-bold text-danger inset-ring inset-ring-danger-line hover:bg-danger-fill/15',
};

/** Button classes, also used on links styled as buttons. */
export function buttonClass(
    variant: ButtonVariant = 'primary',
    className?: string,
) {
    return cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm disabled:opacity-60',
        buttonVariants[variant],
        className,
    );
}

export function Button({
    variant = 'primary',
    className,
    type = 'button',
    ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant }) {
    return (
        <button
            type={type}
            className={buttonClass(variant, className)}
            {...props}
        />
    );
}

/** Side-by-side options with one selected (shelf, store, view). */
export function Segmented({
    options,
    value,
    onChange,
    className,
}: {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'grid gap-1 rounded-full bg-surface p-1 inset-ring inset-ring-border',
                className,
            )}
            style={{
                gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            }}
        >
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'h-9 rounded-full px-3 text-[13px] font-bold',
                            selected
                                ? 'bg-text text-bg'
                                : 'text-secondary hover:bg-elevated hover:text-text',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
