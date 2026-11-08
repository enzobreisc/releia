import { Link } from '@inertiajs/react';
import { SectionTitle } from '@/components/page-header';
import type { RequestOptions } from '@/hooks/use-suggestion-requests';
import { useTranslation } from '@/hooks/use-translation';
import { index as libraryIndex } from '@/routes/library';
import type { Suggestion } from '@/types';
import { EmptyState } from './empty-state';
import { GenerateButton } from './generate-button';
import { LeadSuggestion } from './lead-suggestion';
import { SuggestionCard } from './suggestion-card';

export function SuggestionList({
    suggestions,
    hasSources,
    isBusy,
    options,
}: {
    suggestions: Suggestion[];
    hasSources: boolean;
    isBusy: boolean;
    options: RequestOptions;
}) {
    const { t } = useTranslation();
    const [lead, ...rest] = suggestions;

    return (
        <>
            {!hasSources && (
                <EmptyState>
                    {t(
                        'Avalie livros com 4 ou 5 estrelas para receber sugestões.',
                    )}{' '}
                    <Link
                        href={libraryIndex.url()}
                        className="text-link hover:underline"
                    >
                        {t('Ir para a biblioteca')}
                    </Link>
                </EmptyState>
            )}

            {hasSources && suggestions.length === 0 && (
                <EmptyState>
                    {t(
                        'Nenhuma sugestão no momento. Use "Buscar novas sugestões" para procurar mais.',
                    )}
                </EmptyState>
            )}

            {lead && (
                <LeadSuggestion
                    suggestion={lead}
                    disabled={isBusy}
                    options={options}
                />
            )}

            {rest.length > 0 && (
                <section
                    aria-labelledby="more-suggestions"
                    className="flex flex-col gap-3.5"
                >
                    <h2 id="more-suggestions">
                        <SectionTitle>
                            {t('Mais sugestões · :count', {
                                count: rest.length,
                            })}
                        </SectionTitle>
                    </h2>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-3.5">
                        {rest.map((suggestion) => (
                            <SuggestionCard
                                key={suggestion.id}
                                suggestion={suggestion}
                                disabled={isBusy}
                                options={options}
                            />
                        ))}
                    </div>
                </section>
            )}

            {hasSources && suggestions.length > 0 && (
                <div className="flex flex-col items-start gap-2 pb-4">
                    <GenerateButton
                        label="Buscar mais sugestões"
                        isBusy={isBusy}
                        options={options}
                    />
                    <span className="text-xs text-muted">
                        {t(
                            'Cada busca sorteia outros dos seus livros e lê novos resultados, e acrescenta à lista.',
                        )}
                    </span>
                </div>
            )}
        </>
    );
}
