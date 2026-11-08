import { PageHeader } from '@/components/page-header';
import { GenerateButton } from '@/components/suggestions/generate-button';
import { SuggestionList } from '@/components/suggestions/suggestion-list';
import {
    SuggestionSearchForm,
    SuggestionSearchResults,
} from '@/components/suggestion-search';
import { useSuggestionRequests } from '@/hooks/use-suggestion-requests';
import { useTranslation } from '@/hooks/use-translation';
import type { Candidate, Suggestion } from '@/types';

type SuggestionsProps = {
    suggestions: Suggestion[];
    hasSources: boolean;
    query: string;
    results: Candidate[];
};

export default function Suggestions({
    suggestions,
    hasSources,
    query,
    results,
}: SuggestionsProps) {
    const { t } = useTranslation();
    const { isBusy, options } = useSuggestionRequests();

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title={t('Sugestões')}
                description={t('Livros novos, sempre com o motivo')}
                actions={
                    <GenerateButton
                        label="Buscar novas sugestões"
                        isBusy={isBusy}
                        isDisabled={isBusy || !hasSources}
                        options={options}
                    />
                }
            />

            <SuggestionSearchForm key={query} query={query} />

            {query !== '' ? (
                <SuggestionSearchResults query={query} results={results} />
            ) : (
                <SuggestionList
                    suggestions={suggestions}
                    hasSources={hasSources}
                    isBusy={isBusy}
                    options={options}
                />
            )}
        </div>
    );
}
