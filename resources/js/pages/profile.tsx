import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { buttonClass, Field, Select } from '@/components/form';
import { HeatMap } from '@/components/heat-map';
import { PageHeader, SectionTitle } from '@/components/page-header';
import { show as bookShow } from '@/routes/livros';
import { destroy as unpinBook, store as pinBook } from '@/routes/profile/pins';
import type { CalendarDay } from '@/types';

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
    | { type: 'added'; title: string; date: string };

type ProfileProps = {
    since: string;
    totals: { books_read: number; pages_read: number; streak: number };
    pinned: PinnedBook[];
    pin_options: { id: number; title: string }[];
    pin_limit: number;
    calendar: CalendarDay[];
    activity: ActivityItem[];
};

const MONTHS = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
];

/** "2026-03" vira "mar/2026". */
function formatSince(since: string) {
    const [year, month] = since.split('-');

    return `${MONTHS[Number(month) - 1]}/${year}`;
}

function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });
}

/** Texto de um evento da atividade recente. */
function activityText(item: ActivityItem) {
    switch (item.type) {
        case 'finished':
            return `Terminou ${item.title}${item.rating ? ` e deu nota ${item.rating}` : ''}`;
        case 'session':
            return `Leu ${item.pages} ${item.pages === 1 ? 'página' : 'páginas'} de ${item.title}`;
        case 'added':
            return `Adicionou ${item.title} à biblioteca`;
    }
}

function PinnedCard({ book }: { book: PinnedBook }) {
    return (
        <div className="flex min-w-0 flex-[1_1_240px] gap-3.5 rounded-md border bg-surface p-4">
            <Link href={bookShow.url(book.id)} className="shrink-0">
                <BookCover
                    src={book.cover_url}
                    title={book.title}
                    className="w-16"
                />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                    href={bookShow.url(book.id)}
                    className="font-bold hover:text-accent"
                >
                    {book.title}
                </Link>
                <span className="text-[13px] text-muted">
                    {book.genre ? `${book.genre} · ` : ''}
                    {book.authors}
                </span>
                {book.rating !== null && (
                    <span className="text-[13px] text-muted">
                        Nota {book.rating} de 5
                    </span>
                )}
                <button
                    type="button"
                    onClick={() =>
                        router.delete(unpinBook.url(book.id), {
                            preserveScroll: true,
                        })
                    }
                    className="mt-auto self-start text-xs text-faint hover:text-text"
                >
                    Desafixar
                </button>
            </div>
        </div>
    );
}

export default function Profile({
    since,
    totals,
    pinned,
    pin_options,
    pin_limit,
    calendar,
    activity,
}: ProfileProps) {
    const errors = usePage<{ errors: Record<string, string> }>().props.errors;
    const [pinId, setPinId] = useState<string>(
        pin_options[0] ? String(pin_options[0].id) : '',
    );

    return (
        <>
            <PageHeader title="Perfil" crumb="perfil" />

            <div className="flex flex-wrap items-start gap-8">
                <aside className="flex min-w-[180px] flex-[0_1_220px] flex-col gap-3">
                    <div className="size-[140px] rounded-full border bg-elevated" />
                    <div className="font-mono text-2xl font-bold">
                        Seu perfil
                    </div>
                    <div className="text-sm text-muted">
                        Leitor desde {formatSince(since)}
                    </div>
                    <div className="flex flex-col gap-1.5 text-[13px] text-muted">
                        <span>
                            <span className="font-mono text-text">
                                {totals.books_read}
                            </span>{' '}
                            {totals.books_read === 1
                                ? 'livro lido'
                                : 'livros lidos'}{' '}
                            no total
                        </span>
                        <span>
                            <span className="font-mono text-text">
                                {totals.pages_read}
                            </span>{' '}
                            páginas no total
                        </span>
                        <span>
                            Sequência atual:{' '}
                            <span className="font-mono text-text">
                                {totals.streak}
                            </span>{' '}
                            {totals.streak === 1 ? 'dia' : 'dias'}
                        </span>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-6">
                    <section className="flex flex-col gap-3">
                        <SectionTitle>livros fixados</SectionTitle>
                        {pinned.length > 0 ? (
                            <div className="flex flex-wrap gap-4">
                                {pinned.map((book) => (
                                    <PinnedCard key={book.id} book={book} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted">
                                Nenhum livro fixado ainda.
                            </p>
                        )}

                        {pinned.length < pin_limit &&
                            pin_options.length > 0 && (
                                <form
                                    className="flex flex-wrap items-end gap-3"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        router.post(
                                            pinBook.url(),
                                            { book_id: pinId },
                                            { preserveScroll: true },
                                        );
                                    }}
                                >
                                    <Field
                                        label="Fixar um livro"
                                        className="min-w-0 flex-[1_1_260px]"
                                    >
                                        <Select
                                            value={pinId}
                                            onChange={(event) =>
                                                setPinId(event.target.value)
                                            }
                                        >
                                            {pin_options.map((option) => (
                                                <option
                                                    key={option.id}
                                                    value={option.id}
                                                >
                                                    {option.title}
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>
                                    <button
                                        type="submit"
                                        className={buttonClass('outline')}
                                    >
                                        Fixar
                                    </button>
                                </form>
                            )}
                        {errors?.book_id && (
                            <p className="text-sm text-red-300">
                                {errors.book_id}
                            </p>
                        )}
                    </section>

                    <section className="flex flex-col gap-4 rounded-md border bg-surface p-5">
                        <SectionTitle>mapa de calor do ano</SectionTitle>
                        <HeatMap days={calendar} showLegend />
                    </section>

                    <section className="flex flex-col gap-2">
                        <SectionTitle>atividade recente</SectionTitle>
                        {activity.length === 0 && (
                            <p className="text-sm text-muted">
                                Nenhuma atividade ainda.
                            </p>
                        )}
                        {activity.map((item, index) => (
                            <div
                                key={`${item.type}-${item.date}-${index}`}
                                className="flex flex-wrap justify-between gap-1 border-b py-3 text-sm"
                            >
                                <span className="min-w-0 flex-[1_1_260px]">
                                    {activityText(item)}
                                </span>
                                <span className="shrink-0 font-mono text-muted">
                                    {formatDate(item.date)}
                                </span>
                            </div>
                        ))}
                    </section>
                </div>
            </div>
        </>
    );
}
