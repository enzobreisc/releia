import { BookCover } from '@/components/book-cover';
import { useTranslation } from '@/hooks/use-translation';

type BookSummaryProps = {
    coverUrl: string | null;
    title: string;
    authors: string;
};

export function BookSummary({ coverUrl, title, authors }: BookSummaryProps) {
    const { t } = useTranslation();

    return (
        <div className="flex items-end gap-5">
            <BookCover
                src={coverUrl}
                title={title || t('sem capa')}
                className="w-32"
            />
            <div className="flex min-w-0 flex-col gap-1.5 pb-1">
                <span className="text-[26px] leading-none font-extrabold tracking-tight">
                    {title}
                </span>
                <span className="text-sm font-semibold text-secondary">
                    {authors}
                </span>
            </div>
        </div>
    );
}
