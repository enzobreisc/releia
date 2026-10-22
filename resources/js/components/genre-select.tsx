import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

function fold(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}

/**
 * Genre with a suggestion list. Accepts free text: the list only helps keep
 * names consistent, so filters and statistics group correctly. Genres are stored
 * under their Portuguese name and only displayed translated.
 */
export function GenreSelect({
    value,
    onChange,
    genres,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    genres: string[];
    className?: string;
}) {
    const { t, translateText } = useTranslation();
    const id = useId();
    const root = useRef<HTMLDivElement>(null);
    const list = useRef<HTMLUListElement>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    // Only filters after the person types: when opened, shows everything.
    const [typed, setTyped] = useState(false);

    const shownValue = genres.includes(value) ? translateText(value) : value;

    const options = useMemo(() => {
        const query = fold(shownValue.trim());

        return typed && query
            ? genres.filter((genre) =>
                  fold(translateText(genre)).includes(query),
              )
            : genres;
    }, [genres, shownValue, typed, translateText]);

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

    useEffect(() => {
        list.current
            ?.querySelector('[aria-selected="true"]')
            ?.scrollIntoView({ block: 'nearest' });
    }, [active, open]);

    function choose(genre: string) {
        onChange(genre);
        setOpen(false);
        setTyped(false);
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActive((current) =>
                Math.max(
                    0,
                    Math.min(
                        options.length - 1,
                        current + (event.key === 'ArrowDown' ? 1 : -1),
                    ),
                ),
            );
        } else if (event.key === 'Enter' && open) {
            // Inside a form, Enter would save the book.
            event.preventDefault();

            if (options[active]) {
                choose(options[active]);
            } else {
                setOpen(false);
            }
        } else if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
        }
    }

    return (
        <div ref={root} className="relative">
            <input
                role="combobox"
                aria-expanded={open}
                aria-controls={`${id}-list`}
                aria-autocomplete="list"
                autoComplete="off"
                value={shownValue}
                placeholder={t('Escolha ou digite')}
                onFocus={() => setOpen(true)}
                onClick={() => setOpen(true)}
                onChange={(event) => {
                    onChange(
                        genres.find(
                            (genre) =>
                                fold(translateText(genre)) ===
                                fold(event.target.value.trim()),
                        ) ?? event.target.value,
                    );
                    setTyped(true);
                    setActive(0);
                    setOpen(true);
                }}
                onKeyDown={onKeyDown}
                className={cn(
                    'h-10 w-full rounded-sm border bg-bg px-3 pr-9 text-[15px] text-text placeholder:text-muted focus:border-primary focus:outline-none',
                    className,
                )}
            />
            <button
                type="button"
                tabIndex={-1}
                aria-label={open ? t('Fechar gêneros') : t('Abrir gêneros')}
                onClick={() => setOpen(!open)}
                className="absolute inset-y-0 right-0 w-9 text-muted hover:text-text"
            >
                {open ? '▴' : '▾'}
            </button>

            {open && (
                <ul
                    ref={list}
                    id={`${id}-list`}
                    role="listbox"
                    className="absolute top-full right-0 left-0 z-60 mt-1.5 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-strong bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                >
                    {options.length === 0 && (
                        <li className="px-3 py-2 text-xs text-muted">
                            {shownValue.trim()
                                ? t(
                                      'Nenhum gênero com “:genre”. Fica como você digitou.',
                                      { genre: shownValue.trim() },
                                  )
                                : t('Nenhum gênero.')}
                        </li>
                    )}
                    {options.map((genre, index) => (
                        <li
                            key={genre}
                            role="option"
                            aria-selected={index === active}
                            // mousedown: the click happens before the field loses focus.
                            onMouseDown={(event) => {
                                event.preventDefault();
                                choose(genre);
                            }}
                            onMouseEnter={() => setActive(index)}
                            className={cn(
                                'flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-[14px] text-text',
                                index === active && 'bg-elevated',
                            )}
                        >
                            {translateText(genre)}
                            {genre === value && (
                                <span className="text-accent">✓</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
