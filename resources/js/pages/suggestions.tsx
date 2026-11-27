import { PageHeader } from '@/components/page-header';
import { SuggestionBoard } from '@/components/suggestions/suggestion-board';
import { SuggestionRequestPanel } from '@/components/suggestions/suggestion-request-panel';
import { useSuggestionRequest } from '@/hooks/use-suggestion-request';
import { useSuggestionRequests } from '@/hooks/use-suggestion-requests';
import { useTranslation } from '@/hooks/use-translation';
import type {
    Suggestion,
    SuggestionAvailability,
    SuggestionRequest,
} from '@/types';

type SuggestionsProps = {
    suggestions: Suggestion[];
    hasSources: boolean;
    request: SuggestionRequest | null;
    interpreter: { model: string };
    interpreterAvailability?: SuggestionAvailability;
};

export default function Suggestions({
    suggestions,
    hasSources,
    request,
    interpreter,
    interpreterAvailability,
}: SuggestionsProps) {
    const { t } = useTranslation();
    const cards = useSuggestionRequests();
    const flow = useSuggestionRequest({ request, interpreterAvailability });
    const isBusy = cards.isBusy || flow.isBusy;

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                title={t('Sugestões')}
                description={t('Livros novos, sempre com o motivo')}
            />

            <SuggestionRequestPanel flow={flow} model={interpreter.model} />

            <SuggestionBoard
                results={request?.results ?? []}
                pending={suggestions}
                showsResults={flow.showsResults}
                tab={flow.tab}
                hasSources={hasSources}
                isDisabled={isBusy}
                options={cards.options}
                canDropPageLimit={flow.canDropPageLimit}
                onDropPageLimit={flow.actions.dropPageLimit}
                answeredEveryBook={flow.answeredEveryBook}
                onAskAgain={flow.actions.focusField}
                onTabChange={flow.setTab}
            />
        </div>
    );
}
