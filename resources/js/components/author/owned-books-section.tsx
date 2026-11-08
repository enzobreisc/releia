import { SectionTitle } from '@/components/page-header';
import { OwnedBook } from '@/components/author/owned-book';
import { useTranslation } from '@/hooks/use-translation';
import type { SpineBook } from '@/types';

export function OwnedBooksSection({ books }: { books: SpineBook[] }) {
    const { t } = useTranslation();

    return (
        <section className="flex flex-col gap-4">
            <SectionTitle>
                {t('Na sua biblioteca · :count', { count: books.length })}
            </SectionTitle>
            <ul className="flex flex-wrap gap-7">
                {books.map((book) => (
                    <li key={book.id}>
                        <OwnedBook book={book} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
