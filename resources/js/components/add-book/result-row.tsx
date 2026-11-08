import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { buttonClass } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { show } from '@/routes/books';
import type { Candidate } from '@/types';

type ResultRowProps = {
    result: Candidate;
    selected: boolean;
    onSelect: () => void;
    editionsOpen: boolean;
    onToggleEditions?: () => void;
    children?: ReactNode;
};

export function ResultRow({
    result,
    selected,
    onSelect,
    editionsOpen,
    onToggleEditions,
    children,
}: ResultRowProps) {
    const { t } = useTranslation();
    const meta = [
        result.authors.join(', ') || t('Autor desconhecido'),
        result.published_year,
        result.publisher,
    ].filter(Boolean);

    return (
        <article
            className={cardClass(
                selected ? 'bg-active inset-ring-primary' : undefined,
            )}
        >
            <div className="flex items-center gap-4 px-4 py-3.5">
                <BookCover
                    src={result.cover_url}
                    title={result.title}
                    className="w-12"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                    <span className="line-clamp-2 text-base font-extrabold">
                        {result.title}
                    </span>
                    <span className="line-clamp-1 text-[13px] font-medium text-muted">
                        {meta.join(' · ')}
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted">
                        {result.isbn_13 && <span>ISBN {result.isbn_13}</span>}
                        {result.library_id !== null && (
                            <span className="text-link">
                                {t('já na biblioteca')}
                            </span>
                        )}
                    </span>
                </div>
                <div className="flex gap-2">
                    {onToggleEditions && (
                        <button
                            type="button"
                            onClick={onToggleEditions}
                            aria-expanded={editionsOpen}
                            className={buttonClass(
                                'ghost',
                                'h-10 bg-transparent px-4 text-[13px]',
                            )}
                        >
                            {editionsOpen ? '−' : '+'}{' '}
                            {t(':count edições', {
                                count: result.edition_count ?? 0,
                            })}
                        </button>
                    )}
                    {result.library_id ? (
                        <Link
                            href={show.url(result.library_id)}
                            className={buttonClass(
                                'ghost',
                                'h-10 px-4 text-[13px]',
                            )}
                        >
                            {t('Abrir')}
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={onSelect}
                            aria-pressed={selected}
                            className={buttonClass(
                                selected ? 'outline' : 'ghost',
                                'h-10 px-4 text-[13px]',
                            )}
                        >
                            {selected ? t('✓ Escolhido') : t('Escolher')}
                        </button>
                    )}
                </div>
            </div>
            {children}
        </article>
    );
}
