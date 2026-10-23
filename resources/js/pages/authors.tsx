import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { Input, Segmented } from '@/components/form';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { cardClass } from '@/components/card';
import { useTranslation } from '@/hooks/use-translation';
import { initialOf, matchesSearch, sortAuthors } from '@/lib/authors';
import type { AuthorSort } from '@/lib/authors';
import { cn } from '@/lib/utils';
import { show } from '@/routes/authors';
import type { AuthorIndexEntry } from '@/types';

const HERO_COVER_LIMIT = 3;
const HERO_COVER_WIDTH = 120;
const HERO_COVER_OFFSET = 60;
const HERO_COVER_TILTS = [-8, -3, 0];
const ROW_COVER_LIMIT = 8;
const RATING_FRACTION_DIGITS = 1;
const SORT_GROUP_LABELS: Record<Exclude<AuthorSort, 'alpha'>, string> = {
    read: '#',
    rating: '★',
};

type AuthorGroup = { label: string; authors: AuthorIndexEntry[] };

function useNumberFormat() {
    const { languageTag } = useTranslation();

    return {
        integer: (value: number) =>
            new Intl.NumberFormat(languageTag).format(value),
        rating: (value: number | null) =>
            value === null
                ? '—'
                : new Intl.NumberFormat(languageTag, {
                      maximumFractionDigits: RATING_FRACTION_DIGITS,
                  }).format(value),
    };
}

function groupAuthors(
    authors: AuthorIndexEntry[],
    sort: AuthorSort,
): AuthorGroup[] {
    if (authors.length === 0) {
        return [];
    }

    if (sort !== 'alpha') {
        return [{ label: SORT_GROUP_LABELS[sort], authors }];
    }

    const groups = new Map<string, AuthorIndexEntry[]>();

    for (const author of authors) {
        const initial = initialOf(author.name);
        groups.set(initial, [...(groups.get(initial) ?? []), author]);
    }

    return [...groups].map(([label, members]) => ({
        label,
        authors: members,
    }));
}

function HeroStat({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <dt className="text-xs font-bold text-muted">{label}</dt>
            <dd className="mt-0.5 text-[26px] font-extrabold">{children}</dd>
        </div>
    );
}

function TopAuthorHero({ author }: { author: AuthorIndexEntry }) {
    const { t } = useTranslation();
    const format = useNumberFormat();
    const covers = author.books
        .filter((book) => book.is_read)
        .slice(0, HERO_COVER_LIMIT);

    return (
        <Link
            href={show.url(author.id)}
            aria-label={t('Abrir :name', { name: author.name })}
            className="relative flex flex-wrap items-end gap-10 overflow-hidden rounded-lg bg-elevated p-8 inset-ring inset-ring-strong"
        >
            <div
                aria-hidden="true"
                className="relative h-55 shrink-0"
                style={{
                    width:
                        HERO_COVER_WIDTH +
                        HERO_COVER_OFFSET * (covers.length - 1),
                }}
            >
                {covers.map((book, index) => (
                    <span
                        key={book.id}
                        className="absolute bottom-0 origin-bottom-right"
                        style={{
                            left: index * HERO_COVER_OFFSET,
                            transform: `rotate(${HERO_COVER_TILTS[HERO_COVER_TILTS.length - covers.length + index]}deg)`,
                        }}
                    >
                        <BookCover
                            src={book.cover_url}
                            title={book.title}
                            className="w-30 shadow-hero"
                        />
                    </span>
                ))}
            </div>
            <div className="flex min-w-0 flex-1 basis-85 flex-col gap-4">
                <SectionTitle>{t('Seu autor mais lido')}</SectionTitle>
                <span className="text-[clamp(44px,5vw,68px)] leading-[0.92] font-extrabold tracking-[-0.045em]">
                    {author.name}
                </span>
                <dl className="flex flex-wrap gap-x-8 gap-y-3">
                    <HeroStat label={t('lidos')}>
                        {author.read}{' '}
                        <span className="text-sm font-semibold text-muted">
                            {t('de :count', { count: author.owned })}
                        </span>
                    </HeroStat>
                    <HeroStat label={t('páginas')}>
                        {format.integer(author.pages_read)}
                    </HeroStat>
                    <HeroStat label={t('nota média')}>
                        {format.rating(author.average_rating)}
                    </HeroStat>
                    {author.reading_share !== null && (
                        <HeroStat label={t('da sua leitura')}>
                            {author.reading_share}%
                        </HeroStat>
                    )}
                </dl>
            </div>
        </Link>
    );
}

function AuthorRow({ author }: { author: AuthorIndexEntry }) {
    const { t } = useTranslation();
    const format = useNumberFormat();

    return (
        <Link
            href={show.url(author.id)}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto_20px] items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 hover:bg-active sm:grid-cols-[minmax(180px,1.6fr)_minmax(120px,1.2fr)_minmax(70px,0.6fr)_minmax(70px,0.6fr)_20px]"
        >
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[17px] font-extrabold tracking-tight">
                    {author.name}
                </span>
                {author.last_finished_title && (
                    <span className="truncate font-mono text-[11px] text-muted">
                        {t('último: :title', {
                            title: author.last_finished_title,
                        })}
                    </span>
                )}
            </span>
            <span
                role="img"
                aria-label={t(':count livros na biblioteca', {
                    count: author.owned,
                })}
                className="hidden h-10 items-end gap-0.5 sm:flex"
            >
                {author.books.slice(0, ROW_COVER_LIMIT).map((book) => (
                    <BookCover
                        key={book.id}
                        src={book.cover_url}
                        title={book.title}
                        className={cn('w-6.5', !book.is_read && 'opacity-45')}
                    />
                ))}
            </span>
            <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-extrabold">
                    {author.read}/{author.owned}
                </span>
                <span className="text-[11px] font-semibold text-muted">
                    {t('lidos')}
                </span>
            </span>
            <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-extrabold">
                    {format.rating(author.average_rating)}
                </span>
                <span className="text-[11px] font-semibold text-muted">
                    {t('nota média')}
                </span>
            </span>
            <span aria-hidden="true" className="text-base text-faint">
                ›
            </span>
        </Link>
    );
}

function LetterIndex({
    letters,
    selected,
    onSelect,
}: {
    letters: string[];
    selected: string | null;
    onSelect: (letter: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <nav aria-label={t('Índice')} className="flex flex-wrap gap-0.5">
            {letters.map((letter) => (
                <button
                    key={letter}
                    type="button"
                    aria-pressed={letter === selected}
                    onClick={() => onSelect(letter)}
                    className={cn(
                        'size-8 rounded-full text-xs font-extrabold',
                        letter === selected
                            ? 'bg-text text-bg'
                            : 'text-secondary hover:bg-elevated hover:text-text',
                    )}
                >
                    {letter}
                </button>
            ))}
        </nav>
    );
}

export default function Authors({
    authors,
    authors_with_read_books: authorsWithReadBooks,
}: {
    authors: AuthorIndexEntry[];
    authors_with_read_books: number;
}) {
    const { t, plural } = useTranslation();
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<AuthorSort>('read');
    const [letter, setLetter] = useState<string | null>(null);

    const topAuthor = useMemo(() => {
        const [first] = sortAuthors(authors, 'read');

        return first && first.read > 0 ? first : null;
    }, [authors]);
    const letters = useMemo(
        () =>
            [
                ...new Set(authors.map((author) => initialOf(author.name))),
            ].sort(),
        [authors],
    );
    const groups = useMemo(() => {
        const visible = authors.filter(
            (author) =>
                matchesSearch(author.name, search) &&
                (letter === null || initialOf(author.name) === letter),
        );

        return groupAuthors(sortAuthors(visible, sort), sort);
    }, [authors, search, sort, letter]);

    const isFiltering = search.trim() !== '' || letter !== null;

    function pickLetter(picked: string) {
        setLetter(picked === letter ? null : picked);
        setSort('alpha');
    }

    const sortOptions = [
        { value: 'read', label: t('Mais lidos') },
        { value: 'alpha', label: t('A–Z') },
        { value: 'rating', label: t('Melhor nota') },
    ];

    return (
        <>
            <PageHeader
                title={t('Autores')}
                description={`${plural(authors.length, 'autor', 'autores')} · ${t(
                    ':count com pelo menos um livro lido',
                    { count: authorsWithReadBooks },
                )}`}
                actions={
                    <label className="flex flex-col gap-1.5 text-xs font-bold text-muted sm:w-75">
                        {t('Buscar autor')}
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('Nome do autor')}
                        />
                    </label>
                }
            />

            {authors.length === 0 ? (
                <p className={cardClass('p-5 text-sm text-muted')}>
                    {t(
                        'Os autores aparecem aqui conforme você adiciona livros.',
                    )}
                </p>
            ) : (
                <>
                    {!isFiltering && topAuthor && (
                        <TopAuthorHero author={topAuthor} />
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Segmented
                            options={sortOptions}
                            value={sort}
                            onChange={(value) => setSort(value as AuthorSort)}
                        />
                        <LetterIndex
                            letters={letters}
                            selected={letter}
                            onSelect={pickLetter}
                        />
                    </div>

                    <div className="flex flex-col gap-7">
                        {groups.map((group) => (
                            <section
                                key={group.label}
                                aria-label={group.label}
                                className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-4"
                            >
                                <span className="text-[44px] leading-none font-extrabold tracking-tighter text-heat-2">
                                    {group.label}
                                </span>
                                <div
                                    className={cardClass(
                                        'flex flex-col overflow-hidden',
                                    )}
                                >
                                    {group.authors.map((author) => (
                                        <AuthorRow
                                            key={author.id}
                                            author={author}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>

                    {groups.length === 0 && (
                        <p className="text-[15px] font-semibold text-muted">
                            {t('Nenhum autor com esse nome.')}
                        </p>
                    )}
                </>
            )}
        </>
    );
}
