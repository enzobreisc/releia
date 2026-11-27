import type { RequestOptions } from '@/hooks/use-suggestion-requests';
import type { Suggestion } from '@/types';
import { SuggestionCard } from './suggestion-card';

export function SuggestionList({
    suggestions,
    isDisabled,
    options,
}: {
    suggestions: Suggestion[];
    isDisabled: boolean;
    options: RequestOptions;
}) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-3.5">
            {suggestions.map((suggestion) => (
                <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    disabled={isDisabled}
                    options={options}
                />
            ))}
        </div>
    );
}
