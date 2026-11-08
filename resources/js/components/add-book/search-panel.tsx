import { SearchForm } from '@/components/add-book/search-form';
import { SearchResults } from '@/components/add-book/search-results';
import type { BookSearch } from '@/hooks/use-add-book-search';
import { useTranslation } from '@/hooks/use-translation';
import type { Candidate, Editions } from '@/types';

type SearchPanelProps = {
    query: string;
    publisher: string;
    results: Candidate[];
    editions: Editions | null;
    search: BookSearch;
    selected: string | null;
    openWork: string | null;
    onSelect: (candidate: Candidate) => void;
    onToggleEditions: (workKey: string) => void;
    onManual: () => void;
};

export function SearchPanel({
    query,
    publisher,
    results,
    editions,
    search,
    selected,
    openWork,
    onSelect,
    onToggleEditions,
    onManual,
}: SearchPanelProps) {
    const { t } = useTranslation();

    return (
        <section
            aria-label={t('Resultados')}
            className="flex min-w-0 flex-[3_1_480px] flex-col gap-4.5"
        >
            <SearchForm search={search} />

            {query !== '' ? (
                <SearchResults
                    results={results}
                    publisher={publisher}
                    editions={editions}
                    searching={search.searching}
                    selected={selected}
                    openWork={openWork}
                    onSelect={onSelect}
                    onToggleEditions={onToggleEditions}
                    onManual={onManual}
                />
            ) : (
                <button
                    type="button"
                    onClick={onManual}
                    className="self-start text-[13px] font-bold text-link hover:text-text"
                >
                    {t('Não achou? Cadastrar à mão')}
                </button>
            )}
        </section>
    );
}
