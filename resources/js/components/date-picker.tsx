import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { longDate, today } from '@/lib/dates';
import { cn } from '@/lib/utils';

const MONTHS = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
];

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function parse(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function format(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function shift(value: string, days: number): string {
    const date = parse(value);
    date.setDate(date.getDate() + days);

    return format(date);
}

/**
 * Calendário próprio no lugar do `<input type="date">`, cujo seletor nativo
 * não combina com o tema. Valor em "2026-10-14" (vazio = sem data).
 */
export function DatePicker({
    value,
    onChange,
    min,
    max,
    disabled = false,
    clearable = false,
    placeholder = 'dd/mm/aaaa',
    className,
    ...aria
}: {
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    disabled?: boolean;
    clearable?: boolean;
    placeholder?: string;
    className?: string;
    'aria-label'?: string;
}) {
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    // Dia com o foco do teclado; o mês mostrado acompanha.
    const [focused, setFocused] = useState(value || today());

    const view = parse(focused);
    const selected = value || null;
    const outOfRange = (day: string) =>
        (min !== undefined && day < min) || (max !== undefined && day > max);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onPointerDown(event: MouseEvent) {
            if (!root.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', onPointerDown);

        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    function toggle() {
        if (!open) {
            setFocused(value || clamp(today()));
        }

        setOpen(!open);
    }

    function clamp(day: string): string {
        if (max !== undefined && day > max) {
            return max;
        }

        return min !== undefined && day < min ? min : day;
    }

    function pick(day: string) {
        if (outOfRange(day)) {
            return;
        }

        onChange(day);
        setOpen(false);
        trigger.current?.focus();
    }

    function moveMonth(months: number) {
        const next = new Date(view.getFullYear(), view.getMonth() + months, 1);
        const lastDay = new Date(
            next.getFullYear(),
            next.getMonth() + 1,
            0,
        ).getDate();
        next.setDate(Math.min(view.getDate(), lastDay));
        setFocused(format(next));
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const steps: Record<string, number> = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -7,
            ArrowDown: 7,
        };

        if (event.key === 'Escape') {
            // O diálogo de fora também fecha com Esc; aqui fecha só o calendário.
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
        } else if (event.key in steps) {
            event.preventDefault();
            setFocused(shift(focused, steps[event.key]));
        } else if (event.key === 'PageUp' || event.key === 'PageDown') {
            event.preventDefault();
            moveMonth(event.key === 'PageUp' ? -1 : 1);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            pick(focused);
        }
    }

    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const days = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(first);
        date.setDate(1 - first.getDay() + index);

        return {
            key: format(date),
            number: date.getDate(),
            inMonth: date.getMonth() === view.getMonth(),
        };
    });
    // A última semana só entra se tiver dia do mês.
    const weeks = days.slice(35).some((day) => day.inMonth) ? 6 : 5;

    return (
        <div ref={root} className="relative">
            <button
                ref={trigger}
                type="button"
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={
                    aria['aria-label']
                        ? `${aria['aria-label']}${value ? `: ${longDate(value)}` : ''}`
                        : undefined
                }
                onClick={toggle}
                className={cn(
                    'flex h-11 w-full items-center justify-between gap-2 rounded-sm border bg-surface px-3 text-left text-[15px] focus:border-primary focus:outline-none disabled:opacity-60',
                    open && 'border-primary',
                    !value && 'text-muted',
                    className,
                )}
            >
                <span>{value ? longDate(value) : placeholder}</span>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    className="shrink-0 text-muted"
                    aria-hidden="true"
                >
                    <rect x="2" y="3" width="12" height="11" rx="2" />
                    <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
                </svg>
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Escolher data"
                    onKeyDown={onKeyDown}
                    className="absolute top-full left-0 z-60 mt-1.5 w-64 rounded-lg border border-strong bg-surface p-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                >
                    <div className="mb-2 flex items-center justify-between gap-1">
                        <NavButton
                            label="Ano anterior"
                            onClick={() => moveMonth(-12)}
                        >
                            «
                        </NavButton>
                        <NavButton
                            label="Mês anterior"
                            onClick={() => moveMonth(-1)}
                        >
                            ‹
                        </NavButton>
                        <span className="min-w-0 flex-1 text-center text-[13px] font-semibold">
                            {MONTHS[view.getMonth()]} {view.getFullYear()}
                        </span>
                        <NavButton
                            label="Próximo mês"
                            onClick={() => moveMonth(1)}
                        >
                            ›
                        </NavButton>
                        <NavButton
                            label="Próximo ano"
                            onClick={() => moveMonth(12)}
                        >
                            »
                        </NavButton>
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 pb-1 text-center font-mono text-[11px] text-faint">
                        {WEEKDAYS.map((weekday, index) => (
                            <span key={index}>{weekday}</span>
                        ))}
                    </div>

                    <div role="grid" className="grid grid-cols-7 gap-0.5">
                        {days.slice(0, weeks * 7).map((day) => {
                            const isSelected = day.key === selected;
                            const isToday = day.key === today();
                            const blocked = outOfRange(day.key);

                            return (
                                <button
                                    key={day.key}
                                    type="button"
                                    tabIndex={day.key === focused ? 0 : -1}
                                    ref={(element) => {
                                        if (element && day.key === focused) {
                                            element.focus({
                                                preventScroll: true,
                                            });
                                        }
                                    }}
                                    disabled={blocked}
                                    aria-selected={isSelected}
                                    aria-current={isToday ? 'date' : undefined}
                                    aria-label={longDate(day.key)}
                                    onClick={() => pick(day.key)}
                                    className={cn(
                                        'h-8 rounded-sm text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                                        day.inMonth
                                            ? 'text-text'
                                            : 'text-faint',
                                        !isSelected &&
                                            !blocked &&
                                            'hover:bg-elevated',
                                        isToday &&
                                            !isSelected &&
                                            'border border-accent text-accent',
                                        isSelected &&
                                            'bg-primary font-semibold text-white',
                                        blocked &&
                                            'cursor-not-allowed opacity-30',
                                    )}
                                >
                                    {day.number}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs">
                        <button
                            type="button"
                            disabled={outOfRange(today())}
                            onClick={() => pick(today())}
                            className="rounded-sm px-2 py-1 text-accent hover:bg-elevated disabled:opacity-40"
                        >
                            hoje
                        </button>
                        {clearable && value && (
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setOpen(false);
                                    trigger.current?.focus();
                                }}
                                className="rounded-sm px-2 py-1 text-muted hover:bg-elevated hover:text-text"
                            >
                                limpar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function NavButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            tabIndex={-1}
            onClick={onClick}
            className="size-7 shrink-0 rounded-sm text-base text-muted hover:bg-elevated hover:text-text"
        >
            {children}
        </button>
    );
}
