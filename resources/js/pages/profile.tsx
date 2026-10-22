import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Bookshelf } from '@/components/bookshelf';
import { Button, Field, Input, Select } from '@/components/form';
import { HeatMap, heatClass } from '@/components/heat-map';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { show as bookShow } from '@/routes/books';
import { update as updateLocale } from '@/routes/locale';
import { show as profileShow, update as updateProfile } from '@/routes/profile';
import { destroy as unpinBook, store as pinBook } from '@/routes/profile/pins';
import type { CalendarDay, Option, SpineBook } from '@/types';

type PinnedBook = {
    id: number;
    title: string;
    authors: string;
    genre: string | null;
    cover_url: string | null;
    rating: number | null;
};

type ActivityItem =
    | { type: 'finished'; title: string; date: string; rating: number | null }
    | { type: 'session'; title: string; date: string; pages: number }
    | { type: 'added'; title: string; date: string }
    | { type: 'reread'; title: string; date: string };

type ProfileProps = {
    reader: { name: string | null; bio: string | null };
    locales: Option[];
    since: string;
    totals: {
        books_read: number;
        pages_read: number;
        pages_per_day: number | null;
        streak: number;
        longest_streak: number;
    };
    genres: { label: string; count: number }[];
    avatar: number[];
    pinned: PinnedBook[];
    pin_options: { id: number; title: string }[];
    pin_limit: number;
    year_books: SpineBook[];
    year: number;
    years: number[];
    calendar: CalendarDay[];
    year_summary: { reading_days: number; longest_streak: number };
    activity: ActivityItem[];
};

type Translator = ReturnType<typeof useTranslation>;

/** Icon, verb and extra text of an activity event. */
function describe(item: ActivityItem, { t, plural }: Translator) {
    switch (item.type) {
        case 'finished':
            return {
                icon: '✓',
                done: true,
                verb: t('Terminou'),
                extra: item.rating
                    ? ` · ${t('nota :rating', { rating: item.rating })}`
                    : '',
            };
        case 'session':
            return {
                icon: '+',
                done: false,
                verb: t('Leu'),
                extra: ` · +${plural(item.pages, 'pág', 'págs')}`,
            };
        case 'added':
            return {
                icon: '◇',
                done: false,
                verb: t('Adicionou'),
                extra: ` ${t('à biblioteca')}`,
            };
        case 'reread':
            return {
                icon: '↻',
                done: false,
                verb: t('Começou a reler'),
                extra: '',
            };
    }
}

/** Activity grouped by month, most recent first: "outubro de 2026". */
function byMonth(activity: ActivityItem[], languageTag: string) {
    const groups: { month: string; items: ActivityItem[] }[] = [];

    for (const item of activity) {
        const [year, month] = item.date.split('-');
        const label = new Date(
            Number(year),
            Number(month) - 1,
        ).toLocaleDateString(languageTag, { month: 'long', year: 'numeric' });
        const last = groups[groups.length - 1];

        if (last?.month === label) {
            last.items.push(item);
        } else {
            groups.push({ month: label, items: [item] });
        }
    }

    return groups;
}

export default function Profile({
    reader,
    locales,
    since,
    totals,
    genres,
    avatar,
    pinned,
    pin_options,
    pin_limit,
    year_books,
    year,
    years,
    calendar,
    year_summary,
    activity,
}: ProfileProps) {
    const { t, plural } = useTranslation();

    return (
        <>
            <PageHeader title={t('Perfil')} crumb={t('perfil')} />

            <div className="flex flex-wrap items-start gap-8">
                <ReaderCard
                    reader={reader}
                    locales={locales}
                    since={since}
                    totals={totals}
                    genres={genres}
                    avatar={avatar}
                />

                <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-7">
                    <PinnedSection
                        pinned={pinned}
                        options={pin_options}
                        limit={pin_limit}
                    />

                    <section
                        aria-label={t('Estante do ano')}
                        className="flex flex-col gap-3 rounded-md border bg-surface px-5 py-4.5"
                    >
                        <SectionTitle>
                            {t('Estante de :year · :books', {
                                year,
                                books: plural(
                                    year_books.length,
                                    'livro',
                                    'livros',
                                ),
                            })}
                        </SectionTitle>
                        {year_books.length > 0 ? (
                            <Bookshelf
                                books={year_books}
                                group="given"
                                bookshelves={[]}
                            />
                        ) : (
                            <p className="font-mono text-xs text-faint">
                                {t('nenhum livro terminado em :year', { year })}
                            </p>
                        )}
                    </section>

                    <section
                        aria-label={t('Calendário de leitura')}
                        className="flex flex-col gap-3 rounded-md border bg-surface px-5 py-4.5"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <SectionTitle>
                                {t(':days de leitura em :year', {
                                    days: plural(
                                        year_summary.reading_days,
                                        'dia',
                                        'dias',
                                    ),
                                    year,
                                })}
                            </SectionTitle>
                            {years.length > 1 && (
                                <div
                                    role="tablist"
                                    aria-label={t('Ano')}
                                    className="flex gap-1"
                                >
                                    {years.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            role="tab"
                                            aria-selected={option === year}
                                            onClick={() =>
                                                router.get(
                                                    profileShow.url(),
                                                    { year: option },
                                                    {
                                                        only: [
                                                            'year',
                                                            'calendar',
                                                            'year_summary',
                                                        ],
                                                        preserveScroll: true,
                                                        preserveState: true,
                                                        replace: true,
                                                    },
                                                )
                                            }
                                            className={cn(
                                                'rounded-[5px] px-2.5 py-1.5 font-mono text-xs',
                                                option === year
                                                    ? 'bg-primary text-white'
                                                    : 'text-muted hover:bg-active hover:text-text',
                                            )}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <HeatMap days={calendar} />
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-muted">
                            <span className="font-mono">
                                {t('maior sequência:')}{' '}
                                {plural(
                                    year_summary.longest_streak,
                                    'dia',
                                    'dias',
                                )}
                            </span>
                            <span className="flex items-center gap-1 font-mono">
                                {t('menos')}
                                {[0, 1, 2, 3, 4].map((level) => (
                                    <span
                                        key={level}
                                        className={cn(
                                            'size-[11px] rounded-[2px]',
                                            heatClass(level),
                                        )}
                                    />
                                ))}
                                {t('mais')}
                            </span>
                        </div>
                    </section>

                    <ActivitySection activity={activity} />
                </div>
            </div>
        </>
    );
}

function ReaderCard({
    reader,
    locales,
    since,
    totals,
    genres,
    avatar,
}: Pick<
    ProfileProps,
    'reader' | 'locales' | 'since' | 'totals' | 'genres' | 'avatar'
>) {
    const { t, plural, locale, monthYear, translateText, languageTag } =
        useTranslation();
    const [editing, setEditing] = useState(false);
    const form = useForm({ name: reader.name ?? '', bio: reader.bio ?? '' });

    function save(event: FormEvent) {
        event.preventDefault();
        form.put(updateProfile.url(), {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
        });
    }

    const stats = [
        { label: t('livros lidos'), value: String(totals.books_read) },
        {
            label: t('páginas'),
            value: totals.pages_read.toLocaleString(languageTag),
        },
        {
            label: t('sequência'),
            value: plural(totals.streak, 'dia', 'dias'),
            title: t('Maior sequência: :days', {
                days: plural(totals.longest_streak, 'dia', 'dias'),
            }),
        },
        {
            label: t('págs/dia'),
            value:
                totals.pages_per_day === null
                    ? '—'
                    : String(Math.round(totals.pages_per_day * 10) / 10),
        },
    ];

    return (
        <aside
            aria-label={t('Leitor')}
            className="flex min-w-[200px] flex-[0_1_240px] flex-col gap-4"
        >
            <div
                role="img"
                aria-label={t('Avatar: seus últimos 25 dias de leitura')}
                title={t('Seus últimos 25 dias de leitura')}
                className="grid size-40 grid-cols-5 grid-rows-5 gap-1.5 rounded-2xl border bg-surface p-4.5"
            >
                {avatar.map((level, index) => (
                    <span
                        key={index}
                        className={cn('rounded-[3px]', heatClass(level))}
                    />
                ))}
            </div>

            {editing ? (
                <form onSubmit={save} className="flex flex-col gap-2.5">
                    <Field label={t('Nome')} error={form.errors.name}>
                        <Input
                            autoFocus
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            maxLength={60}
                            className="h-10"
                        />
                    </Field>
                    <Field label={t('Sobre você')} error={form.errors.bio}>
                        <Input
                            value={form.data.bio}
                            onChange={(event) =>
                                form.setData('bio', event.target.value)
                            }
                            maxLength={160}
                            placeholder={t('O que você gosta de ler')}
                            className="h-10"
                        />
                    </Field>
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="h-10 flex-1"
                        >
                            {t('Salvar')}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                form.reset();
                                setEditing(false);
                            }}
                            className="h-10"
                        >
                            {t('Cancelar')}
                        </Button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="flex flex-col gap-0.5">
                        <div className="font-mono text-2xl font-bold">
                            {reader.name ?? t('Seu perfil')}
                        </div>
                        <div className="font-mono text-sm text-muted">
                            {t('leitor desde :date', {
                                date: monthYear(`${since}-01`),
                            })}
                        </div>
                    </div>
                    {reader.bio && (
                        <p className="text-sm leading-relaxed text-[#c9d3e3]">
                            {reader.bio}
                        </p>
                    )}
                    <Button
                        variant="ghost"
                        onClick={() => setEditing(true)}
                        className="h-10 text-[13px] font-semibold"
                    >
                        {t('Editar perfil')}
                    </Button>
                </>
            )}

            <Field label={t('Idioma')}>
                <Select
                    value={locale}
                    onChange={(event) =>
                        router.put(
                            updateLocale.url(),
                            { locale: event.target.value },
                            { preserveScroll: true },
                        )
                    }
                    className="h-10"
                >
                    {locales.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </Field>

            <div className="h-px bg-border" />

            <dl className="grid grid-cols-2 gap-x-3 gap-y-3.5">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        title={stat.title}
                        className="flex flex-col gap-0.5"
                    >
                        <dt className="font-mono text-[11px] text-muted">
                            {stat.label}
                        </dt>
                        <dd className="font-mono text-xl font-bold">
                            {stat.value}
                        </dd>
                    </div>
                ))}
            </dl>

            {genres.length > 0 && (
                <>
                    <div className="h-px bg-border" />
                    <div className="flex flex-col gap-2">
                        <span className="font-mono text-[11px] text-muted">
                            {t('gêneros mais lidos')}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {genres.map((genre) => (
                                <span
                                    key={genre.label}
                                    title={translateText(genre.label)}
                                    className="max-w-full truncate rounded-full border px-2 py-0.5 text-xs"
                                >
                                    #{translateText(genre.label).toLowerCase()}{' '}
                                    <span className="font-mono text-muted">
                                        {genre.count}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </aside>
    );
}

function PinnedSection({
    pinned,
    options,
    limit,
}: {
    pinned: PinnedBook[];
    options: { id: number; title: string }[];
    limit: number;
}) {
    const { t } = useTranslation();
    const errors = usePage<{ errors: Record<string, string> }>().props.errors;
    const [editing, setEditing] = useState(pinned.length === 0);
    const canPin = pinned.length < limit && options.length > 0;

    return (
        <section
            aria-label={t('Livros fixados')}
            className="flex flex-col gap-3"
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>
                    {t('fixados · :count/:limit', {
                        count: pinned.length,
                        limit,
                    })}
                </SectionTitle>
                <button
                    type="button"
                    onClick={() => setEditing(!editing)}
                    className="text-[13px] font-semibold text-accent hover:underline"
                >
                    {editing ? t('Concluir') : t('Organizar fixados')}
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {pinned.map((book) => (
                    <PinnedCard key={book.id} book={book} editing={editing} />
                ))}

                {editing && canPin && (
                    <label className="flex min-h-26.5 flex-col justify-center gap-2 rounded-md border border-dashed p-3.5 text-xs text-muted">
                        {t('Fixar outro livro')}
                        <select
                            defaultValue=""
                            onChange={(event) =>
                                event.target.value &&
                                router.post(
                                    pinBook.url(),
                                    { book_id: event.target.value },
                                    { preserveScroll: true },
                                )
                            }
                            className="h-10 w-full rounded-sm border bg-bg px-2.5 text-sm text-text"
                        >
                            <option value="" disabled>
                                {t('Escolha um livro…')}
                            </option>
                            {options.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.title}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            {pinned.length === 0 && !canPin && (
                <p className="text-sm text-muted">
                    {t(
                        'Adicione livros à biblioteca para fixar os seus favoritos aqui.',
                    )}
                </p>
            )}
            {errors?.book_id && (
                <p className="text-sm text-red-300">{errors.book_id}</p>
            )}
        </section>
    );
}

function PinnedCard({ book, editing }: { book: PinnedBook; editing: boolean }) {
    const { t, translateText } = useTranslation();

    return (
        <article className="relative flex gap-3.5 rounded-md border bg-surface p-3.5">
            <Link href={bookShow.url(book.id)} className="shrink-0">
                <BookCover
                    src={book.cover_url}
                    title={book.title}
                    className="w-13"
                />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                    href={bookShow.url(book.id)}
                    className="truncate pr-6 text-[15px] font-bold text-accent hover:underline"
                >
                    {book.title}
                </Link>
                <span className="truncate text-[13px] text-muted">
                    {book.authors || t('Autor desconhecido')}
                </span>
                <div className="mt-auto flex items-center gap-3 text-xs text-muted">
                    {book.genre && (
                        <span className="flex min-w-0 items-center gap-1.5">
                            <span className="size-2.5 shrink-0 rounded-full bg-heat-3" />
                            <span className="truncate">
                                {translateText(book.genre)}
                            </span>
                        </span>
                    )}
                    {book.rating !== null && (
                        <span
                            aria-label={t('Nota :rating de 5', {
                                rating: book.rating,
                            })}
                            className="font-mono tracking-[1px] text-accent"
                        >
                            {'★'.repeat(book.rating)}
                            {'☆'.repeat(5 - book.rating)}
                        </span>
                    )}
                </div>
            </div>
            {editing && (
                <button
                    type="button"
                    aria-label={t('Desafixar :title', { title: book.title })}
                    onClick={() =>
                        router.delete(unpinBook.url(book.id), {
                            preserveScroll: true,
                        })
                    }
                    className="absolute top-2 right-2 size-7 rounded-sm border bg-bg text-sm text-muted hover:text-text"
                >
                    ×
                </button>
            )}
        </article>
    );
}

function ActivitySection({ activity }: { activity: ActivityItem[] }) {
    const translator = useTranslation();
    const { t, shortDate, languageTag } = translator;

    return (
        <section
            aria-label={t('Atividade recente')}
            className="flex flex-col gap-2.5"
        >
            <SectionTitle>{t('atividade')}</SectionTitle>
            {activity.length === 0 && (
                <p className="text-sm text-muted">
                    {t('Nenhuma atividade ainda.')}
                </p>
            )}
            {byMonth(activity, languageTag).map((group) => (
                <div key={group.month} className="flex flex-col">
                    <div className="flex items-center gap-2.5 pt-1 pb-2 text-[13px] font-semibold">
                        {group.month}
                        <span className="h-px flex-1 bg-border" />
                    </div>
                    <ol className="ml-2.5 flex flex-col border-l">
                        {group.items.map((item, index) => {
                            const { icon, done, verb, extra } = describe(
                                item,
                                translator,
                            );

                            return (
                                <li
                                    key={`${item.type}-${item.date}-${index}`}
                                    className="relative flex items-center gap-3 py-2 pl-5"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            'absolute -left-2.5 flex size-5 items-center justify-center rounded-full border bg-bg font-mono text-[10px]',
                                            done ? 'text-heat-3' : 'text-muted',
                                        )}
                                    >
                                        {icon}
                                    </span>
                                    <span className="min-w-0 flex-1 text-sm">
                                        {verb}{' '}
                                        <span className="font-semibold text-accent">
                                            {item.title}
                                        </span>
                                        <span className="text-muted">
                                            {extra}
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-mono text-xs text-muted">
                                        {shortDate(item.date)}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            ))}
        </section>
    );
}
