import type { KeyboardEvent } from 'react';
import { cardClass } from '@/components/card';
import type { ResultTab } from '@/hooks/use-suggestion-request';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export const RESULT_PANEL_ID = 'suggestions-panel';

function tabId(tab: ResultTab): string {
    return `${tab}-tab`;
}

/** Arrows cycle through the tabs; Home and End jump to the first and the last. */
function tabIndexAfterKey(
    key: string,
    current: number,
    count: number,
): number | undefined {
    switch (key) {
        case 'ArrowRight':
            return (current + 1) % count;
        case 'ArrowLeft':
            return (current - 1 + count) % count;
        case 'Home':
            return 0;
        case 'End':
            return count - 1;
        default:
            return undefined;
    }
}

export function SuggestionTabs({
    tab,
    resultCount,
    pendingCount,
    onChange,
}: {
    tab: ResultTab;
    resultCount: number;
    pendingCount: number;
    onChange: (tab: ResultTab) => void;
}) {
    const { t } = useTranslation();
    const tabs: { value: ResultTab; label: string }[] = [
        {
            value: 'result',
            label: t('Resultado do pedido · :count', { count: resultCount }),
        },
        {
            value: 'pending',
            label: t('Pendentes · :count', { count: pendingCount }),
        },
    ];

    function moveWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
        const index = tabIndexAfterKey(
            event.key,
            tabs.findIndex((option) => option.value === tab),
            tabs.length,
        );

        if (index === undefined) {
            return;
        }

        event.preventDefault();
        const next = tabs[index].value;
        onChange(next);
        document.getElementById(tabId(next))?.focus();
    }

    return (
        <div
            role="tablist"
            aria-label={t('Sugestões')}
            onKeyDown={moveWithKeyboard}
            className={cardClass(
                'flex flex-wrap gap-1 self-start rounded-full p-1',
            )}
        >
            {tabs.map((option) => {
                const isSelected = option.value === tab;

                return (
                    <button
                        key={option.value}
                        id={tabId(option.value)}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-controls={RESULT_PANEL_ID}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'h-10 rounded-full px-4 text-[13px] font-bold whitespace-nowrap',
                            isSelected
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
