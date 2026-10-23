import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { buttonClass } from '@/components/form';
import { DisplayTitle, SectionTitle } from '@/components/page-header';
import { StatusBadge, STATUS_LABELS } from '@/components/status';
import type { Status } from '@/components/status';
import { useTranslation } from '@/hooks/use-translation';
import { index as authorsIndex, works as worksRoute } from '@/routes/authors';
import { create as addBook, show as bookShow } from '@/routes/books';
import type { SpineBook } from '@/types';

type Work = {
    title: string;
    year: number | null;
    cover_url: string | null;
    work_key: string | null;
    edition_count: number | null;
    portuguese: boolean;
};

type Works = { verified: boolean; items: Work[] };

const INITIALS_LENGTH = 2;

function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .slice(0, INITIALS_LENGTH)
        .join('')
        .toUpperCase();
}

export default function Author({
    author,
    books,
}: {
    author: { id: number; name: string };
    books: SpineBook[];
}) {
    const { t, plural } = useTranslation();
    const statusSummary = (Object.keys(STATUS_LABELS) as Status[])
        .map((status) => ({
            status,
            count: books.filter((book) => book.status === status).length,
        }))
        .filter(({ count }) => count > 0)
        .map(
            ({ status, count }) =>
                `${count} ${t(STATUS_LABELS[status]).toLowerCase()}`,
        )
        .join(', ');

    return (
        <>
            <Head title={author.name} />
            <Link
                href={authorsIndex.url()}
                className="self-start text-[13px] font-semibold text-secondary hover:text-text"
            >
                ← {t('Todos os autores')}
            </Link>

            <header className="flex flex-wrap items-end gap-8">
                <span
                    aria-hidden="true"
                    className="flex size-30 shrink-0 items-center justify-center rounded-full bg-active text-[40px] font-extrabold tracking-tight text-link inset-ring inset-ring-strong"
                >
                    {initialsOf(author.name)}
                </span>
                <div className="flex min-w-0 flex-col gap-2">
                    <DisplayTitle>{author.name}</DisplayTitle>
                    <p className="text-[15px] font-medium text-muted">
                        {t(':books na sua biblioteca', {
                            books: plural(books.length, 'livro', 'livros'),
                        })}
                        {statusSummary && ` · ${statusSummary}`}
                    </p>
                </div>
            </header>

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

            <OtherWorks authorId={author.id} name={author.name} />
        </>
    );
}

function OwnedBook({ book }: { book: SpineBook }) {
    const stars = book.status === 'read' ? (book.rating ?? 0) : 0;

    return (
        <Link href={bookShow.url(book.id)} className="flex items-end gap-4.5">
            <BookCover
                src={book.cover_url}
                title={book.title}
                className="w-30"
            />
            <span className="flex min-w-0 flex-col gap-1 pb-1">
                <span className="text-lg font-extrabold">{book.title}</span>
                {book.status && book.status_label && (
                    <span className="flex items-center gap-2">
                        <StatusBadge
                            status={book.status}
                            label={book.status_label}
                        />
                        {stars > 0 && (
                            <span
                                aria-label={`${stars}/5`}
                                className="text-xs font-bold text-secondary"
                            >
                                {'★'.repeat(stars)}
                            </span>
                        )}
                    </span>
                )}
            </span>
        </Link>
    );
}

/** Works missing from the library, from Open Library by the author's keys. */
function OtherWorks({ authorId, name }: { authorId: number; name: string }) {
    const { t } = useTranslation();
    const [works, setWorks] = useState<Works | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;

        fetch(worksRoute.url(authorId), {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data: Works) => active && setWorks(data))
            .catch(() => active && setFailed(true));

        return () => {
            active = false;
        };
    }, [authorId]);

    return (
        <section className="flex flex-col gap-4">
            <SectionTitle>
                {works?.verified
                    ? t('Outras obras de :name · :count', {
                          name,
                          count: works.items.length,
                      })
                    : t('Outras obras de :name', { name })}
            </SectionTitle>

            {failed && (
                <p className="text-sm text-muted">
                    {t(
                        'Não foi possível buscar as obras agora. Tente de novo mais tarde.',
                    )}
                </p>
            )}
            {!failed && works === null && (
                <p className="font-mono text-xs text-muted">
                    {t('buscando obras…')}
                </p>
            )}
            {works && !works.verified && (
                <p className={cardClass('p-4 text-sm text-muted')}>
                    {t(
                        'Não foi possível identificar este autor com segurança (há homônimos), então não mostramos obras que poderiam ser de outra pessoa.',
                    )}
                </p>
            )}
            {works?.verified && works.items.length === 0 && (
                <p className="text-sm text-muted">
                    {t('Você já tem todas as obras que encontramos.')}
                </p>
            )}

            {works?.verified && works.items.length > 0 && (
                <ul className={cardClass('flex flex-col overflow-hidden')}>
                    {works.items.map((work) => (
                        <li
                            key={work.work_key ?? work.title}
                            className="flex flex-wrap items-center gap-4 border-b px-4.5 py-3.5 last:border-b-0"
                        >
                            <BookCover
                                src={work.cover_url}
                                title={work.title}
                                className="w-10"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                                <span className="text-base font-extrabold">
                                    {work.title}
                                </span>
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
                                        <span className="text-link">
                                            {t('em português')}
                                        </span>
                                    )}
                                </span>
                            </div>
                            <Link
                                href={addBook.url({
                                    query: {
                                        q: `${work.title} ${name}`,
                                        ...(work.work_key && {
                                            work: work.work_key,
                                        }),
                                    },
                                })}
                                className={buttonClass(
                                    'ghost',
                                    'h-10 px-4 text-[13px]',
                                )}
                            >
                                {t('+ Adicionar')}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
