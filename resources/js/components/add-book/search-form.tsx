import { Button, Field, Input } from '@/components/form';
import type { BookSearch } from '@/hooks/use-add-book-search';
import { useTranslation } from '@/hooks/use-translation';

export function SearchForm({ search }: { search: BookSearch }) {
    const { t } = useTranslation();

    return (
        <form
            role="search"
            onSubmit={search.submit}
            className="flex flex-wrap items-end gap-2.5"
        >
            <Field label={t('ISBN ou título')} className="flex-[3_1_260px]">
                <Input
                    autoFocus
                    type="search"
                    value={search.term}
                    onChange={(event) => search.setTerm(event.target.value)}
                />
            </Field>
            <Field label={t('editora:')} className="flex-[1_1_150px]">
                <Input
                    type="search"
                    value={search.publisherFilter}
                    onChange={(event) =>
                        search.setPublisherFilter(event.target.value)
                    }
                    placeholder={t('qualquer')}
                />
            </Field>
            <Button
                type="submit"
                disabled={search.searching || search.term.trim() === ''}
                className="px-5.5"
            >
                {search.searching ? t('Buscando…') : t('Buscar')}
            </Button>
        </form>
    );
}
