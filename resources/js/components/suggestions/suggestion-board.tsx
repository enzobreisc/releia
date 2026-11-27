import { Link } from '@inertiajs/react';
import { cardClass } from '@/components/card';
import { Button } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import type { ResultTab } from '@/hooks/use-suggestion-request';
import type { RequestOptions } from '@/hooks/use-suggestion-requests';
import { useTranslation } from '@/hooks/use-translation';
import { index as libraryIndex } from '@/routes/library';
import type { Suggestion } from '@/types';
import { EmptyState } from './empty-state';
import { SuggestionList } from './suggestion-list';
import { RESULT_PANEL_ID, SuggestionTabs } from './suggestion-tabs';

export function SuggestionBoard({
    results,
    pending,
    showsResults,
    tab,
    hasSources,
    isDisabled,
    options,
    canDropPageLimit,
    onDropPageLimit,
    answeredEveryBook,
    onAskAgain,
    onTabChange,
}: {
    results: Suggestion[];
    pending: Suggestion[];
    showsResults: boolean;
    tab: ResultTab;
    hasSources: boolean;
    isDisabled: boolean;
    options: RequestOptions;
    canDropPageLimit: boolean;
    onDropPageLimit: () => void;
    answeredEveryBook: boolean;
    onAskAgain: () => void;
    onTabChange: (tab: ResultTab) => void;
}) {
    const { t } = useTranslation();

    if (!showsResults) {
        const title = t('Pendentes · :count', { count: pending.length });

        return (
            <section aria-label={title} className="flex flex-col gap-3.5">
                <SectionTitle>{title}</SectionTitle>
                <PendingPanel
                    pending={pending}
                    hasSources={hasSources}
                    isDisabled={isDisabled}
                    options={options}
                />
            </section>
        );
    }

    return (
        <div className="flex flex-col gap-3.5">
            <SuggestionTabs
                tab={tab}
                resultCount={results.length}
                pendingCount={pending.length}
                onChange={onTabChange}
            />
            <div
                id={RESULT_PANEL_ID}
                role="tabpanel"
                aria-labelledby={
                    tab === 'result' ? 'result-tab' : 'pending-tab'
                }
            >
                {tab === 'result' ? (
                    <div className="flex flex-col items-start gap-3.5">
                        {answeredEveryBook ? (
                            <AnsweredPanel onAskAgain={onAskAgain} />
                        ) : (
                            <SuggestionList
                                suggestions={results}
                                isDisabled={isDisabled}
                                options={options}
                            />
                        )}
                        {canDropPageLimit && (
                            <Button
                                variant="ghost"
                                disabled={isDisabled}
                                onClick={onDropPageLimit}
                            >
                                {t('Tirar o limite de páginas')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <PendingPanel
                        pending={pending}
                        hasSources={hasSources}
                        isDisabled={isDisabled}
                        options={options}
                    />
                )}
            </div>
        </div>
    );
}

function AnsweredPanel({ onAskAgain }: { onAskAgain: () => void }) {
    const { t } = useTranslation();

    return (
        <div className={cardClass('flex flex-col items-start gap-3 p-4.5')}>
            <p className="text-sm text-secondary">
                {t('Você já respondeu a todos os livros deste pedido.')}
            </p>
            <Button variant="ghost" onClick={onAskAgain}>
                {t('Pedir de outro jeito')}
            </Button>
        </div>
    );
}

function PendingPanel({
    pending,
    hasSources,
    isDisabled,
    options,
}: {
    pending: Suggestion[];
    hasSources: boolean;
    isDisabled: boolean;
    options: RequestOptions;
}) {
    const { t } = useTranslation();

    if (pending.length > 0) {
        return (
            <SuggestionList
                suggestions={pending}
                isDisabled={isDisabled}
                options={options}
            />
        );
    }

    if (!hasSources) {
        return (
            <EmptyState>
                {t(
                    'Avalie livros com 4 ou 5 estrelas, ou adicione livros a Quero ler ou à lista de compras, para receber sugestões.',
                )}{' '}
                <Link
                    href={libraryIndex.url()}
                    className="text-link hover:underline"
                >
                    {t('Ir para a biblioteca')}
                </Link>
            </EmptyState>
        );
    }

    return (
        <EmptyState>
            {t(
                'Nenhuma sugestão pendente no momento. Peça um livro acima para procurar.',
            )}
        </EmptyState>
    );
}
