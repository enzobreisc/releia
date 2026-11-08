import { ResultList } from '@/components/add-book/result-list';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import type { Candidate, Editions } from '@/types';

type SearchResultsProps = {
    results: Candidate[];
    publisher: string;
    editions: Editions | null;
    searching: boolean;
    selected: string | null;
    openWork: string | null;
    onSelect: (candidate: Candidate) => void;
    onToggleEditions: (workKey: string) => void;
    onManual: () => void;
};

export function SearchResults({
    results,
    publisher,
    editions,
    searching,
    selected,
    openWork,
    onSelect,
    onToggleEditions,
    onManual,
}: SearchResultsProps) {
    const { t } = useTranslation();

    return (
        <>
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>
                    {searching
                        ? t('buscando…')
                        : t('resultados · :count', {
                              count: results.length,
                          })}
                </SectionTitle>
                {publisher && (
                    <span className="font-mono text-[11px] text-muted">
                        {t('editora:')} {publisher}
                    </span>
                )}
                <button
                    type="button"
                    onClick={onManual}
                    className="text-[13px] font-bold text-link hover:text-text"
                >
                    {t('Não achou? Cadastrar à mão')}
                </button>
            </div>
            {results.length > 0 && (
                <ResultList
                    results={results}
                    publisher={publisher}
                    editions={editions}
                    selected={selected}
                    openWork={openWork}
                    onSelect={onSelect}
                    onToggleEditions={onToggleEditions}
                />
            )}
            {!searching && results.length === 0 && (
                <p className="text-sm text-muted">
                    {t('Nada encontrado na Open Library nem no Google Books.')}
                </p>
            )}
        </>
    );
}
