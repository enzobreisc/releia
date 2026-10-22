import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { SearchIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';
import { commandItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

type CommandPaletteProps = {
    onClose: () => void;
};

/** "Go to" (⌘P): quick search for screens. */
export function CommandPalette({ onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const { t } = useTranslation();

    const results = commandItems.filter((item) =>
        normalize(t(item.title)).includes(normalize(query)),
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
            className="fixed inset-0 z-50 flex items-start justify-center bg-bg/75 px-4 pt-[15vh] backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={t('Ir para')}
                className="w-full max-w-lg overflow-hidden rounded-lg bg-surface shadow-float"
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
                        placeholder={t('Ir para…')}
                        aria-label={t('Buscar telas')}
                        className="h-13 flex-1 bg-transparent text-[15px] font-semibold text-text outline-none placeholder:text-faint"
                    />
                </label>
                <ul
                    role="listbox"
                    aria-label={t('Telas')}
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
                                    'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-semibold',
                                    index === selected
                                        ? 'bg-active text-text'
                                        : 'text-nav',
                                )}
                            >
                                <item.icon />
                                {t(item.title)}
                            </button>
                        </li>
                    ))}
                    {results.length === 0 && (
                        <li className="px-3 py-2.5 text-sm font-medium text-muted">
                            {t('nada encontrado')}
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
