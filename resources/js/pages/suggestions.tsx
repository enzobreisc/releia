import { PageHeader } from '@/components/page-header';
import { AiRankingPanel } from '@/components/suggestions/ai-ranking-panel';
import { GenerateButton } from '@/components/suggestions/generate-button';
import { SuggestionList } from '@/components/suggestions/suggestion-list';
import {
    SuggestionSearchForm,
    SuggestionSearchResults,
} from '@/components/suggestion-search';
import { useAiRanking } from '@/hooks/use-ai-ranking';
import { useSuggestionRequests } from '@/hooks/use-suggestion-requests';
import { useTranslation } from '@/hooks/use-translation';
import type { AiAvailability, AiRanking, Candidate, Suggestion } from '@/types';

type SuggestionsProps = {
    suggestions: Suggestion[];
    hasSources: boolean;
    query: string;
    results: Candidate[];
    aiRanking: AiRanking;
    aiAvailability?: AiAvailability | null;
};

export default function Suggestions({
    suggestions,
    hasSources,
    query,
    results,
    aiRanking,
    aiAvailability,
}: SuggestionsProps) {
    const { t } = useTranslation();
    const { isBusy, options } = useSuggestionRequests();
    const aiRequest = useAiRanking();

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

            <AiRankingPanel
                ranking={aiRanking}
                availability={aiAvailability}
                isBusy={aiRequest.isBusy}
                onToggle={aiRequest.setEnabled}
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
