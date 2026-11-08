import { SuggestionEditions } from '@/components/suggestion-editions';
import type { RequestOptions } from '@/hooks/use-suggestion-requests';
import type { SuggestionChoice } from '@/hooks/use-suggestion-choice';

export function SuggestionEditionsPanel({
    id,
    disabled,
    options,
    choice,
}: {
    id: number;
    disabled: boolean;
    options: RequestOptions;
    choice: SuggestionChoice;
}) {
    if (!choice.isVisible) {
        return null;
    }

    return (
        <SuggestionEditions
            key={choice.choosing ?? 'browse'}
            id={id}
            disabled={disabled}
            options={options}
            mode={choice.choosing}
            onCancel={choice.close}
        />
    );
}
