import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { Bookshelf } from '@/components/bookshelf';
import { cardClass } from '@/components/card';
import {
    Button,
    Field,
    IconButton,
    Input,
    Segmented,
    Select,
    Textarea,
} from '@/components/form';
import { HeatMap, heatClass } from '@/components/heat-map';
import { SectionTitle } from '@/components/page-header';
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
    | {
          type: 'finished';
          book_id: number;
          title: string;
          date: string;
          rating: number | null;
      }
    | {
          type: 'session';
          book_id: number;
          title: string;
          date: string;
          pages: number;
      }
    | { type: 'added'; book_id: number; title: string; date: string }
    | { type: 'reread'; book_id: number; title: string; date: string };

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

const ACTIVITY_DOT_CLASSES: Record<ActivityItem['type'], string> = {
    finished: 'bg-text',
    session: 'bg-accent',
    added: 'bg-muted',
    reread: 'bg-accent',
};

function describe(item: ActivityItem, { t, plural }: Translator) {
    switch (item.type) {
        case 'finished':
            return {
                verb: t('Terminou'),
                extra: item.rating
                    ? ` · ${t('nota :rating', { rating: item.rating })}`
                    : '',
            };
        case 'session':
            return {
                verb: t('Leu'),
                extra: ` · +${plural(item.pages, 'pág', 'págs')}`,
            };
        case 'added':
            return { verb: t('Adicionou'), extra: ` ${t('à biblioteca')}` };
        case 'reread':
            return { verb: t('Começou a reler'), extra: '' };
    }
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

    function selectYear(option: string) {
        router.get(
            profileShow.url(),
            { year: option },
            {
                only: ['year', 'calendar', 'year_summary'],
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    }

    return (
        <>
            <Head title={t('Perfil')} />

            <div className="flex flex-wrap items-start gap-8">
                <ReaderCard
                    reader={reader}
                    locales={locales}
                    since={since}
                    totals={totals}
                    genres={genres}
                    avatar={avatar}
                />

                <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-8">
                    <PinnedSection
                        pinned={pinned}
                        options={pin_options}
                        limit={pin_limit}
                    />

                    <section
                        aria-label={t('Estante do ano')}
                        className="flex flex-col gap-3.5"
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
                        className={cardClass(
                            'flex flex-col gap-3.5 rounded-lg p-5.5',
                        )}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <SectionTitle>
                                {t('Calendário de leitura')}
                            </SectionTitle>
                            {years.length > 1 && (
                                <Segmented
                                    options={years.map((option) => ({
                                        value: String(option),
                                        label: String(option),
                                    }))}
                                    value={String(year)}
                                    onChange={selectYear}
                                />
                            )}
                        </div>
                        <span className="text-[13px] font-semibold text-muted">
                            {t(':days de leitura em :year', {
                                days: plural(
                                    year_summary.reading_days,
                                    'dia',
                                    'dias',
                                ),
                                year,
                            })}{' '}
                            · {t('maior sequência:')}{' '}
                            <span className="text-text">
                                {plural(
                                    year_summary.longest_streak,
                                    'dia',
                                    'dias',
                                )}
                            </span>
                        </span>
                        <HeatMap days={calendar} showLegend />
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
            className="flex max-w-80 min-w-[200px] flex-[1_1_260px] flex-col gap-5"
        >
            <div
                role="img"
                aria-label={t('Avatar: seus últimos 25 dias de leitura')}
                title={t('Seus últimos 25 dias de leitura')}
                className="grid size-50 grid-cols-5 grid-rows-5 gap-1.5 rounded-[32px] bg-surface p-3.5 shadow-float inset-ring inset-ring-strong"
            >
                {avatar.map((level, index) => (
                    <span
                        key={index}
                        className={cn('rounded-cover', heatClass(level))}
                    />
                ))}
            </div>

            {editing ? (
                <form onSubmit={save} className="flex flex-col gap-3">
                    <Field label={t('Nome')} error={form.errors.name}>
                        <Input
                            autoFocus
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            maxLength={60}
                        />
                    </Field>
                    <Field label={t('Sobre você')} error={form.errors.bio}>
                        <Textarea
                            rows={3}
                            value={form.data.bio}
                            onChange={(event) =>
                                form.setData('bio', event.target.value)
                            }
                            maxLength={160}
                            placeholder={t('O que você gosta de ler')}
                            className="min-h-0"
                        />
                    </Field>
                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing}>
                            {t('Salvar')}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                form.reset();
                                setEditing(false);
                            }}
                            className="bg-transparent"
                        >
                            {t('Cancelar')}
                        </Button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-4xl leading-none font-extrabold tracking-tighter">
                            {reader.name ?? t('Seu perfil')}
                        </h1>
                        <span className="font-mono text-xs text-muted">
                            {t('leitor desde :date', {
                                date: monthYear(`${since}-01`),
                            })}
                        </span>
                    </div>
                    {reader.bio && (
                        <p className="text-[15px] leading-relaxed font-medium text-secondary">
                            {reader.bio}
                        </p>
                    )}
                    <Button variant="ghost" onClick={() => setEditing(true)}>
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
                >
                    {locales.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </Field>

            <dl className="grid grid-cols-2 gap-2.5">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        title={stat.title}
                        className={cardClass('rounded-sm p-3.5')}
                    >
                        <dt className="text-[11px] font-bold text-muted">
                            {stat.label}
                        </dt>
                        <dd className="mt-1 text-2xl font-extrabold">
                            {stat.value}
                        </dd>
                    </div>
                ))}
            </dl>

            {genres.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-muted">
                        {t('gêneros mais lidos')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {genres.map((genre) => (
                            <span
                                key={genre.label}
                                title={`${translateText(genre.label)}: ${genre.count}`}
                                className="inline-flex h-7 max-w-full items-center rounded-full bg-active px-3 text-xs font-bold text-link"
                            >
                                <span className="truncate">
                                    {translateText(genre.label)}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
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
            className="flex flex-col gap-3.5"
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>
                    {t('Livros fixados · :count/:limit', {
                        count: pinned.length,
                        limit,
                    })}
                </SectionTitle>
                <button
                    type="button"
                    onClick={() => setEditing(!editing)}
                    className="text-[13px] font-bold text-link hover:underline"
                >
                    {editing ? t('Concluir') : t('Organizar fixados')}
                </button>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3">
                {pinned.map((book) => (
                    <PinnedCard key={book.id} book={book} editing={editing} />
                ))}

                {editing && canPin && (
                    <label className="flex min-h-26.5 flex-col justify-center gap-2 rounded-md border border-dashed border-strong p-3.5 text-xs font-bold text-muted">
                        {t('Fixar outro livro')}
                        <Select
                            defaultValue=""
                            onChange={(event) =>
                                event.target.value &&
                                router.post(
                                    pinBook.url(),
                                    { book_id: event.target.value },
                                    { preserveScroll: true },
                                )
                            }
                            className="h-10"
                        >
                            <option value="" disabled>
                                {t('Escolha um livro…')}
                            </option>
                            {options.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.title}
                                </option>
                            ))}
                        </Select>
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
                <p className="text-sm text-danger">{errors.book_id}</p>
            )}
        </section>
    );
}

function PinnedCard({ book, editing }: { book: PinnedBook; editing: boolean }) {
    const { t } = useTranslation();

    return (
        <article
            className={cardClass('relative flex items-center gap-3.5 p-3.5')}
        >
            <Link href={bookShow.url(book.id)} className="shrink-0">
                <BookCover
                    src={book.cover_url}
                    title={book.title}
                    className="w-11"
                />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                    href={bookShow.url(book.id)}
                    className={cn(
                        'truncate text-[15px] font-extrabold hover:underline',
                        editing && 'pr-8',
                    )}
                >
                    {book.title}
                </Link>
                <span className="truncate text-xs font-medium text-muted">
                    {book.authors || t('Autor desconhecido')}
                </span>
                {book.rating !== null && (
                    <span
                        aria-label={t('Nota :rating de 5', {
                            rating: book.rating,
                        })}
                        className="text-xs tracking-widest text-text"
                    >
                        {'★'.repeat(book.rating)}
                        {'☆'.repeat(5 - book.rating)}
                    </span>
                )}
            </div>
            {editing && (
                <IconButton
                    label={t('Desafixar :title', { title: book.title })}
                    variant="plain"
                    onClick={() =>
                        router.delete(unpinBook.url(book.id), {
                            preserveScroll: true,
                        })
                    }
                    className="absolute top-2 right-2 size-8"
                >
                    ×
                </IconButton>
            )}
        </article>
    );
}

function ActivitySection({ activity }: { activity: ActivityItem[] }) {
    const translator = useTranslation();
    const { t, shortDate } = translator;

    return (
        <section
            aria-label={t('Atividade recente')}
            className="flex flex-col gap-3.5"
        >
            <SectionTitle>{t('Atividade recente')}</SectionTitle>
            {activity.length === 0 ? (
                <p className="text-sm text-muted">
                    {t('Nenhuma atividade ainda.')}
                </p>
            ) : (
                <ol className={cardClass('flex flex-col overflow-hidden')}>
                    {activity.map((item, index) => {
                        const { verb, extra } = describe(item, translator);

                        return (
                            <li
                                key={`${item.type}-${item.date}-${index}`}
                                className="flex items-center gap-3.5 border-b border-border px-4.5 py-3.5 last:border-b-0"
                            >
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'size-2 shrink-0 rounded-full',
                                        ACTIVITY_DOT_CLASSES[item.type],
                                    )}
                                />
                                <span className="min-w-0 flex-1 text-sm font-medium text-secondary">
                                    {verb}{' '}
                                    <Link
                                        href={bookShow.url(item.book_id)}
                                        className="font-extrabold text-text hover:underline"
                                    >
                                        {item.title}
                                    </Link>
                                    {extra}
                                </span>
                                <span className="shrink-0 font-mono text-[11px] text-muted">
                                    {shortDate(item.date)}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
