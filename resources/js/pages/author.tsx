import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { Bookshelf } from '@/components/bookshelf';
import { buttonClass } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { StatusBadge } from '@/components/status';
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

export default function Author({
    author,
    books,
}: {
    author: { id: number; name: string };
    books: SpineBook[];
}) {
    return (
        <>
            <PageHeader
                title={author.name}
                crumb={['autores', author.name.toLowerCase()]}
                actions={
                    <Link
                        href={authorsIndex.url()}
                        className={buttonClass('ghost')}
                    >
                        Todos os autores
                    </Link>
                }
            />

            <section className="flex flex-col gap-3">
                <SectionTitle>
                    {`Na sua biblioteca · ${books.length}`}
                </SectionTitle>
                <Bookshelf books={books} group="given" bookshelves={[]} />
                <ul className="flex flex-col gap-1.5">
                    {books.map((book) => (
                        <li key={book.id}>
                            <Link
                                href={bookShow.url(book.id)}
                                className="flex items-center gap-3 rounded-sm border bg-surface px-3 py-2 hover:bg-active"
                            >
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                    {book.title}
                                </span>
                                {book.published_year && (
                                    <span className="font-mono text-xs text-muted">
                                        {book.published_year}
                                    </span>
                                )}
                                {book.status && book.status_label && (
                                    <StatusBadge
                                        status={book.status}
                                        label={book.status_label}
                                    />
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <OtherWorks authorId={author.id} name={author.name} />
        </>
    );
}

/** Obras que faltam na biblioteca, vindas da Open Library pelas chaves do autor. */
function OtherWorks({ authorId, name }: { authorId: number; name: string }) {
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
        <section className="flex flex-col gap-3">
            <SectionTitle>
                {works?.verified
                    ? `Outras obras de ${name} · ${works.items.length}`
                    : `Outras obras de ${name}`}
            </SectionTitle>

            {failed && (
                <p className="text-sm text-muted">
                    Não foi possível buscar as obras agora. Tente de novo mais
                    tarde.
                </p>
            )}
            {!failed && works === null && (
                <p className="font-mono text-xs text-muted">buscando obras…</p>
            )}
            {works && !works.verified && (
                <p className="rounded-md border bg-surface p-4 text-sm text-muted">
                    Não foi possível identificar este autor com segurança (há
                    homônimos), então não mostramos obras que poderiam ser de
                    outra pessoa.
                </p>
            )}
            {works?.verified && works.items.length === 0 && (
                <p className="text-sm text-muted">
                    Você já tem todas as obras que encontramos.
                </p>
            )}

            {works?.verified && works.items.length > 0 && (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
                    {works.items.map((work) => (
                        <li
                            key={work.work_key ?? work.title}
                            className="flex gap-3 rounded-md border bg-surface p-3"
                        >
                            <BookCover
                                src={work.cover_url}
                                title={work.title}
                                className="w-14"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="line-clamp-2 text-sm font-semibold">
                                    {work.title}
                                </span>
                                <span className="font-mono text-xs text-muted">
                                    {[
                                        work.year,
                                        work.edition_count &&
                                            `${work.edition_count} edições`,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                                {work.portuguese && (
                                    <span className="self-start rounded-[4px] bg-active px-1.5 py-px font-mono text-[10px] text-accent">
                                        em português
                                    </span>
                                )}
                                <Link
                                    href={addBook.url({
                                        query: {
                                            q: `${work.title} ${name}`,
                                            ...(work.work_key && {
                                                work: work.work_key,
                                            }),
                                        },
                                    })}
                                    className="mt-auto self-start text-xs text-accent hover:underline"
                                >
                                    + Adicionar
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
