import { Bookshelf } from '@/components/bookshelf';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import type { SpineBook } from '@/types';

export function YearShelf({
    books,
    year,
}: {
    books: SpineBook[];
    year: number;
}) {
    const { t, plural } = useTranslation();

    return (
        <section
            aria-label={t('Estante do ano')}
            className="flex flex-col gap-3.5"
        >
            <SectionTitle>
                {t('Estante de :year · :books', {
                    year,
                    books: plural(books.length, 'livro', 'livros'),
                })}
            </SectionTitle>
            {books.length > 0 ? (
                <Bookshelf books={books} />
            ) : (
                <p className="font-mono text-xs text-faint">
                    {t('nenhum livro terminado em :year', { year })}
                </p>
            )}
        </section>
    );
}
