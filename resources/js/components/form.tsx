import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Option } from '@/types';

const controlClass =
    'w-full rounded-sm border bg-surface px-3 text-[15px] text-text placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-60';

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
                'flex min-w-0 flex-col gap-1.5 text-[13px] text-muted',
                className,
            )}
        >
            <span>{label}</span>
            {children}
            {error && <span className="text-xs text-red-300">{error}</span>}
        </label>
    );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
    return <input className={cn(controlClass, 'h-11', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
    return (
        <select className={cn(controlClass, 'h-11', className)} {...props} />
    );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
    return (
        <textarea
            className={cn(controlClass, 'min-h-28 resize-y py-3', className)}
            {...props}
        />
    );
}

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

const buttonVariants: Record<ButtonVariant, string> = {
    primary: 'bg-primary font-semibold text-white hover:bg-primary/90',
    outline:
        'border border-primary bg-surface font-semibold text-accent hover:bg-active',
    ghost: 'border bg-surface text-text hover:bg-active',
    danger: 'border border-red-400/40 bg-surface text-red-300 hover:bg-red-400/10',
};

/** Classes de botão, também usadas em links com cara de botão. */
export function buttonClass(
    variant: ButtonVariant = 'primary',
    className?: string,
) {
    return cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm disabled:opacity-60',
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

/** Opções lado a lado, uma marcada (estante, loja). */
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
            className={cn('grid gap-1 rounded-md border bg-bg p-1', className)}
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
                            'h-10 rounded-[5px] text-[13px]',
                            selected
                                ? 'bg-active font-semibold text-accent'
                                : 'text-nav hover:bg-surface',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
