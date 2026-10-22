import { Link } from '@inertiajs/react';
import { useState } from 'react';
import { Input } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { show } from '@/routes/authors';

type Author = { id: number; name: string; books: number };

export default function Authors({ authors }: { authors: Author[] }) {
    const { t, plural } = useTranslation();
    const [search, setSearch] = useState('');
    const term = search
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
    const visible = authors.filter((author) =>
        author.name
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .includes(term),
    );

    return (
        <>
            <PageHeader
                title={t('Autores')}
                description={t(
                    'Quem você lê, e o que ainda falta ler de cada um',
                )}
            />

            <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('Buscar autor')}
                className="max-w-sm"
            />

            {authors.length === 0 ? (
                <p className="rounded-md border bg-surface p-5 text-sm text-muted">
                    {t(
                        'Os autores aparecem aqui conforme você adiciona livros.',
                    )}
                </p>
            ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
                    {visible.map((author) => (
                        <li key={author.id}>
                            <Link
                                href={show.url(author.id)}
                                className="flex items-center justify-between gap-3 rounded-md border bg-surface px-4 py-3 hover:bg-active"
                            >
                                <span className="min-w-0 truncate text-[15px] font-semibold">
                                    {author.name}
                                </span>
                                <span className="font-mono text-xs text-muted">
                                    {plural(author.books, 'livro', 'livros')}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
