import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { SearchIcon } from '@/components/icons';
import { commandItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

type CommandPaletteProps = {
    onClose: () => void;
};

/** "Ir para" (⌘P): busca rápida de telas. Livros entram na fase 1. */
export function CommandPalette({ onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);

    const results = commandItems.filter((item) =>
        normalize(item.title).includes(normalize(query)),
    );

    function go(href: string) {
        onClose();
        router.visit(href);
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelected((i) => Math.min(i + 1, results.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelected((i) => Math.max(i - 1, 0));
        } else if (event.key === 'Enter' && results[selected]) {
            event.preventDefault();
            go(results[selected].href);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[15vh]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Ir para"
                className="w-full max-w-lg overflow-hidden rounded-md border bg-surface shadow-2xl shadow-black/60"
            >
                <label className="flex items-center gap-3 border-b px-4 text-muted">
                    <SearchIcon />
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setSelected(0);
                        }}
                        onKeyDown={onKeyDown}
                        placeholder="Ir para…"
                        aria-label="Buscar telas"
                        className="h-12 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-muted"
                    />
                </label>
                <ul
                    role="listbox"
                    aria-label="Telas"
                    className="max-h-80 overflow-y-auto p-2"
                >
                    {results.map((item, index) => (
                        <li
                            key={item.href}
                            role="option"
                            aria-selected={index === selected}
                        >
                            <button
                                type="button"
                                onClick={() => go(item.href)}
                                onMouseEnter={() => setSelected(index)}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm',
                                    index === selected
                                        ? 'bg-active text-text'
                                        : 'text-nav',
                                )}
                            >
                                <item.icon />
                                {item.title}
                            </button>
                        </li>
                    ))}
                    {results.length === 0 && (
                        <li className="px-3 py-2.5 font-mono text-sm text-muted">
                            nada encontrado
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}

function normalize(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
}
