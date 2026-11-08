import { Head, Link } from '@inertiajs/react';
import { AuthorHeader } from '@/components/author/author-header';
import { OtherWorksSection } from '@/components/author/other-works-section';
import { OwnedBooksSection } from '@/components/author/owned-books-section';
import { useTranslation } from '@/hooks/use-translation';
import { useAuthorPhoto } from '@/hooks/use-author-photo';
import { useShelfSummary } from '@/hooks/use-shelf-summary';
import { index as authorsIndex } from '@/routes/authors';
import type { SpineBook } from '@/types';

type AuthorProfile = { id: number; name: string; photo_url: string | null };

export default function Author({
    author,
    books,
}: {
    author: AuthorProfile;
    books: SpineBook[];
}) {
    const { t } = useTranslation();
    const photoUrl = useAuthorPhoto(author);
    const shelfSummary = useShelfSummary(books);

    return (
        <>
            <Head title={author.name} />
            <Link
                href={authorsIndex.url()}
                className="self-start text-[13px] font-semibold text-secondary hover:text-text"
            >
                ← {t('Todos os autores')}
            </Link>

            <AuthorHeader
                name={author.name}
                photoUrl={photoUrl}
                bookCount={books.length}
                shelfSummary={shelfSummary}
            />
            <OwnedBooksSection books={books} />
            <OtherWorksSection authorId={author.id} name={author.name} />
        </>
    );
}
