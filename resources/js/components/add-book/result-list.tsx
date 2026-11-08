import { candidateKey } from '@/components/add-book/book-form';
import { EditionList } from '@/components/add-book/edition-list';
import { ResultRow } from '@/components/add-book/result-row';
import type { Candidate, Editions } from '@/types';

type ResultListProps = {
    results: Candidate[];
    publisher: string;
    editions: Editions | null;
    selected: string | null;
    openWork: string | null;
    onSelect: (candidate: Candidate) => void;
    onToggleEditions: (workKey: string) => void;
};

export function ResultList({
    results,
    publisher,
    editions,
    selected,
    openWork,
    onSelect,
    onToggleEditions,
}: ResultListProps) {
    return (
        <div className="flex flex-col gap-2.5">
            {results.map((result, index) => {
                const key = candidateKey(result);
                const workKey = result.work_key;
                const onToggle =
                    workKey && (result.edition_count ?? 0) > 1
                        ? () => onToggleEditions(workKey)
                        : undefined;

                return (
                    <ResultRow
                        key={`${key}-${index}`}
                        result={result}
                        selected={selected === key}
                        onSelect={() => onSelect(result)}
                        editionsOpen={openWork === result.work_key}
                        onToggleEditions={onToggle}
                    >
                        {workKey && openWork === workKey && (
                            <EditionList
                                editions={
                                    editions?.work_key === workKey
                                        ? editions.items
                                        : null
                                }
                                publisher={publisher}
                                selected={selected}
                                onSelect={(edition) =>
                                    onSelect({
                                        ...edition,
                                        authors: result.authors,
                                    })
                                }
                            />
                        )}
                    </ResultRow>
                );
            })}
        </div>
    );
}
