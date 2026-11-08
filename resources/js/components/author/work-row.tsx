import { Link } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { buttonClass } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import type { Work } from '@/hooks/use-author-works';
import { create as addBook } from '@/routes/books';

function addBookHref(work: Work, authorName: string): string {
    return addBook.url({
        query: {
            q: `${work.title} ${authorName}`,
            ...(work.work_key && { work: work.work_key }),
        },
    });
}

export function WorkRow({
    work,
    authorName,
}: {
    work: Work;
    authorName: string;
}) {
    const { t } = useTranslation();

    return (
        <li className="flex flex-wrap items-center gap-4 border-b px-4.5 py-3.5 last:border-b-0">
            <BookCover
                src={work.cover_url}
                title={work.title}
                className="w-10"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                <span className="text-base font-extrabold">{work.title}</span>
                <span className="flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted">
                    {work.year && <span>{work.year}</span>}
                    {work.edition_count && (
                        <span>
                            {t(':count edições', {
                                count: work.edition_count,
                            })}
                        </span>
                    )}
                    {work.portuguese && (
                        <span className="text-link">{t('em português')}</span>
                    )}
                </span>
            </div>
            <Link
                href={addBookHref(work, authorName)}
                className={buttonClass('ghost', 'h-10 px-4 text-[13px]')}
            >
                {t('+ Adicionar')}
            </Link>
        </li>
    );
}
