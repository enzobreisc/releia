import { AuthorAvatar } from '@/components/author-avatar';
import { DisplayTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';

export function AuthorHeader({
    name,
    photoUrl,
    bookCount,
    shelfSummary,
}: {
    name: string;
    photoUrl: string | null;
    bookCount: number;
    shelfSummary: string;
}) {
    const { t, plural } = useTranslation();

    return (
        <header className="flex flex-wrap items-end gap-8">
            <AuthorAvatar
                name={name}
                photoUrl={photoUrl}
                className="size-30 text-[40px]"
            />
            <div className="flex min-w-0 flex-col gap-2">
                <DisplayTitle>{name}</DisplayTitle>
                <p className="text-[15px] font-medium text-muted">
                    {t(':books na sua biblioteca', {
                        books: plural(bookCount, 'livro', 'livros'),
                    })}
                    {shelfSummary && ` · ${shelfSummary}`}
                </p>
            </div>
        </header>
    );
}
