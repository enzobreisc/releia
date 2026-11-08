import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { LibraryBreadcrumb } from '@/components/add-book/library-breadcrumb';
import { ReviewPanel } from '@/components/add-book/review-panel';
import { SearchPanel } from '@/components/add-book/search-panel';
import { Steps } from '@/components/add-book/steps';
import { emptyForm } from '@/components/add-book/book-form';
import type { BookForm } from '@/components/add-book/book-form';
import { PageHeader } from '@/components/page-header';
import { useAddBookEditions } from '@/hooks/use-add-book-editions';
import { useAddBookPreview } from '@/hooks/use-add-book-preview';
import { useAddBookSave } from '@/hooks/use-add-book-save';
import { useAddBookSearch } from '@/hooks/use-add-book-search';
import { useAddBookSelection } from '@/hooks/use-add-book-selection';
import { useTranslation } from '@/hooks/use-translation';
import type { Candidate, Editions, Option } from '@/types';

type AddBookProps = {
    query: string;
    publisher: string;
    results: Candidate[];
    editions: Editions | null;
    preview: Candidate | null;
    statuses: Option[];
    genres: string[];
};

export default function AddBook({
    query,
    publisher,
    results,
    editions,
    preview,
    statuses,
    genres,
}: AddBookProps) {
    const { t } = useTranslation();
    const form = useForm<BookForm>(emptyForm);
    const {
        selected,
        manualMode,
        editing,
        select,
        startManual,
        clearSelection,
    } = useAddBookSelection(form);
    const { openWork, openEditions, toggleEditions, closeEditions } =
        useAddBookEditions(editions?.work_key ?? null);
    const search = useAddBookSearch(
        { query, publisher },
        {
            onBeforeSearch: () => {
                clearSelection();
                closeEditions();
            },
            onPublisherMatch: openEditions,
        },
    );
    const [showMore, setShowMore] = useState(false);
    const save = useAddBookSave(form, selected, manualMode);

    useAddBookPreview(form, preview);

    function manual() {
        startManual(search.term.trim());
        setShowMore(true);
    }

    return (
        <>
            <LibraryBreadcrumb />
            <PageHeader
                title={t('Adicionar livro')}
                actions={<Steps editing={editing} />}
            />

            <div className="flex flex-wrap items-start gap-7">
                <SearchPanel
                    query={query}
                    publisher={publisher}
                    results={results}
                    editions={editions}
                    search={search}
                    selected={selected}
                    openWork={openWork}
                    onSelect={select}
                    onToggleEditions={toggleEditions}
                    onManual={manual}
                />
                <ReviewPanel
                    form={form}
                    editing={editing}
                    statuses={statuses}
                    genres={genres}
                    showMore={showMore}
                    onToggleMore={() => setShowMore(!showMore)}
                    onSubmit={save}
                />
            </div>
        </>
    );
}
