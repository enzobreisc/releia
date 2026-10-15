import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { BookCover } from '@/components/book-cover';
import { BookNotes } from '@/components/book-notes';
import { Button, Segmented, Textarea } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import { QueueButton } from '@/components/queue-button';
import { SessionForm } from '@/components/session-form';
import { SessionLog } from '@/components/session-log';
import { StarRating } from '@/components/star-rating';
import { cn } from '@/lib/utils';
import { destroy, reading as readingRoute } from '@/routes/books';
import { index as libraryIndex } from '@/routes/library';
import type {
    BookDetail,
    Option,
    ReadingProgress,
    ReadingSession,
} from '@/types';
import type { NoteCard } from '@/types/notes';

type BookProps = {
    book: BookDetail;
    slug: string;
    statuses: Option[];
    progress: ReadingProgress | null;
    sessions: ReadingSession[];
    can_log: boolean;
    notes: NoteCard[];
    queued: boolean;
};

type Tab = 'sessions' | 'notes' | 'review';

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

/** "2026-10-14" vira "14 out". */
function shortDate(date: string) {
    const [, month, day] = date.split('-');

    return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
}

function plural(count: number, one: string, many: string) {
    return `${count} ${count === 1 ? one : many}`;
}

export default function Book({
    book,
    slug,
    statuses,
    progress,
    sessions,
    can_log,
    notes,
    queued,
}: BookProps) {
    const reading = book.reading;
    const status = reading?.status ?? 'want_to_read';
    const [saving, setSaving] = useState(false);
    // Livro lido abre na resenha; os outros, no log de sessões.
    const [tab, setTab] = useState<Tab>(
        status === 'read' ? 'review' : 'sessions',
    );

    // Estante e nota salvam na hora; a resenha tem botão próprio.
    function update(data: { status?: string; rating?: number | null }) {
        router.visit(readingRoute(book.id), {
            data,
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        });
    }

    function remove() {
        if (
            confirm(
                `Remover "${book.title}" da biblioteca? Isso apaga também as leituras.`,
            )
        ) {
            router.visit(destroy(book.id));
        }
    }

    const chips = [
        book.pages && `${book.pages} págs`,
        book.publisher,
        book.published_year,
        book.genre && `#${book.genre.toLowerCase()}`,
    ].filter(Boolean);

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'sessions', label: 'Sessões', count: sessions.length },
        { id: 'notes', label: 'Notas', count: notes.length },
        { id: 'review', label: 'Resenha' },
    ];

    return (
        <>
            <Head title={book.title} />
            <div className="font-mono text-[13px] text-muted">
                <Link href={libraryIndex.url()} className="hover:text-text">
                    releia <span className="text-faint">/</span> biblioteca
                </Link>{' '}
                <span className="text-faint">/</span> {slug}
            </div>

            <div className="flex flex-wrap items-start gap-7">
                <BookCover
                    src={book.cover_url}
                    title={book.title}
                    className="w-37.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
                />
                <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
                    <div>
                        <h1 className="font-mono text-[34px] leading-tight font-bold">
                            {book.title}
                        </h1>
                        {book.subtitle && (
                            <p className="mt-1 text-[15px] text-muted">
                                {book.subtitle}
                            </p>
                        )}
                        <p className="mt-1.5 text-base text-nav">
                            {book.authors || 'Autor desconhecido'}
                        </p>
                    </div>

                    {(chips.length > 0 || book.isbn_13) && (
                        <div className="flex flex-wrap gap-1.5">
                            {chips.map((chip) => (
                                <span
                                    key={String(chip)}
                                    className="rounded-[4px] border px-2 py-0.5 font-mono text-[11px] text-muted"
                                >
                                    {chip}
                                </span>
                            ))}
                            {book.isbn_13 && (
                                <span className="px-2 py-0.5 font-mono text-[11px] text-faint">
                                    ISBN {book.isbn_13}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
                        <div role="group" aria-label="Estante">
                            <Segmented
                                options={statuses}
                                value={status}
                                onChange={(value) => update({ status: value })}
                                className="gap-0.5 bg-surface p-0.5 [&>button]:h-9 [&>button]:px-3"
                            />
                        </div>
                        <StarRating
                            value={reading?.rating ?? null}
                            disabled={saving}
                            onChange={(rating) => update({ rating })}
                            size={20}
                        />
                        <div className="ml-auto flex gap-1.5">
                            {status === 'want_to_read' && (
                                <QueueButton bookId={book.id} queued={queued} />
                            )}
                            <MoreMenu onRemove={remove} />
                        </div>
                    </div>

                    {book.description && (
                        <Description text={book.description} />
                    )}
                </div>
            </div>

            {progress && status === 'want_to_read' && (
                <section className="flex flex-wrap items-center gap-4 rounded-md border border-dashed p-5">
                    <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                        <p className="text-[15px] font-semibold">
                            Ainda não começou
                        </p>
                        {progress.pages && progress.pace && (
                            <p className="text-[13px] text-muted">
                                No seu ritmo, {progress.pages} páginas levam ~
                                {plural(
                                    Math.ceil(progress.pages / progress.pace),
                                    'dia',
                                    'dias',
                                )}
                                .
                            </p>
                        )}
                    </div>
                    <Button
                        disabled={saving}
                        onClick={() => update({ status: 'reading' })}
                    >
                        Começar a ler
                    </Button>
                </section>
            )}

            {progress && status !== 'want_to_read' && status !== 'read' && (
                <ProgressCard
                    bookId={book.id}
                    startedAt={reading?.started_at ?? null}
                    progress={progress}
                    sessions={sessions}
                    canLog={can_log}
                    onFinish={() => update({ status: 'read' })}
                />
            )}

            {status === 'read' && reading && (
                <FinishedCard
                    reading={reading}
                    sessions={sessions}
                    pages={book.pages}
                />
            )}

            <section className="flex flex-col gap-1">
                <div
                    role="tablist"
                    aria-label="Detalhes"
                    className="flex gap-0.5 border-b"
                >
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={tab === item.id}
                            onClick={() => setTab(item.id)}
                            className={cn(
                                '-mb-px border-b-2 px-3.5 py-2.5 text-sm',
                                tab === item.id
                                    ? 'border-primary font-semibold text-text'
                                    : 'border-transparent text-muted hover:text-text',
                            )}
                        >
                            {item.label}
                            {item.count !== undefined && (
                                <span className="ml-1.5 font-mono text-[11px] text-faint">
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'sessions' && <SessionLog sessions={sessions} />}
                {tab === 'notes' && (
                    <BookNotes bookId={book.id} notes={notes} />
                )}
                {tab === 'review' && (
                    <ReviewForm
                        bookId={book.id}
                        review={reading?.review ?? ''}
                    />
                )}
            </section>

            <p className="font-mono text-[11px] text-faint">
                dados: {book.source_label}
            </p>
        </>
    );
}

/** Sinopse com no máximo três linhas, expansível. */
function Description({ text }: { text: string }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex max-w-prose flex-col items-start gap-1">
            <p
                className={cn(
                    'text-sm leading-relaxed whitespace-pre-line text-muted',
                    !open && 'line-clamp-3',
                )}
            >
                {text}
            </p>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="font-mono text-xs text-accent hover:underline"
            >
                {open ? '− menos' : '+ sinopse completa'}
            </button>
        </div>
    );
}

/** Ações raras ficam no "⋯", longe dos cliques do dia a dia. */
function MoreMenu({ onRemove }: { onRemove: () => void }) {
    return (
        <details className="relative">
            <summary
                aria-label="Mais ações"
                className="flex size-9 cursor-pointer list-none items-center justify-center rounded-sm border bg-surface text-muted hover:bg-active hover:text-text [&::-webkit-details-marker]:hidden"
            >
                ⋯
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-52 rounded-md border bg-surface p-1 shadow-lg">
                <button
                    type="button"
                    onClick={onRemove}
                    className="w-full rounded-sm px-3 py-2 text-left text-sm text-red-300 hover:bg-red-400/10"
                >
                    Remover da biblioteca
                </button>
            </div>
        </details>
    );
}

function ProgressCard({
    bookId,
    startedAt,
    progress,
    sessions,
    canLog,
    onFinish,
}: {
    bookId: number;
    startedAt: string | null;
    progress: ReadingProgress;
    sessions: ReadingSession[];
    canLog: boolean;
    onFinish: () => void;
}) {
    const finishesOn =
        progress.days_left === null
            ? null
            : (() => {
                  const date = new Date();
                  date.setDate(date.getDate() + progress.days_left);

                  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
              })();

    const stats = [
        {
            label: 'ritmo',
            value:
                progress.pace === null
                    ? '—'
                    : `${Math.round(progress.pace)} págs/dia`,
        },
        { label: 'termina', value: finishesOn ? `~${finishesOn}` : '—' },
        { label: 'sessões', value: String(sessions.length) },
        { label: 'desde', value: startedAt ? shortDate(startedAt) : '—' },
    ];

    return (
        <section
            aria-label="Progresso"
            className="flex flex-col rounded-md border bg-surface"
        >
            <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-4.5 pb-3.5">
                <div className="flex flex-col gap-1">
                    <SectionTitle>progresso</SectionTitle>
                    <p className="font-mono text-[30px] font-bold">
                        pág. {progress.current_page}{' '}
                        {progress.pages !== null && (
                            <span className="text-base font-medium text-muted">
                                / {progress.pages} · {progress.percent}%
                            </span>
                        )}
                    </p>
                </div>
                <dl className="flex gap-6">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <dt className="font-mono text-[11px] text-muted">
                                {stat.label}
                            </dt>
                            <dd className="mt-0.5 font-mono text-[15px] font-bold">
                                {stat.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>

            <SessionBar progress={progress} sessions={sessions} />

            {progress.finish_suggested && (
                <div className="mx-5 mt-3 flex flex-wrap items-center gap-3 rounded-sm border border-primary bg-active p-3 text-sm">
                    <span>Você chegou à última página.</span>
                    <Button variant="outline" onClick={onFinish}>
                        Marcar como lido
                    </Button>
                </div>
            )}

            <div className="mt-4 rounded-b-md border-t bg-[#0d131c] px-5 py-3.5">
                {canLog ? (
                    <SessionForm
                        bookId={bookId}
                        progress={progress}
                        onFinish={onFinish}
                    />
                ) : (
                    <p className="text-sm text-muted">
                        Para registrar sessões, mude a estante para "Lendo".
                    </p>
                )}
            </div>
        </section>
    );
}

/** Barra de progresso em trechos: cada sessão é um pedaço, em tons alternados. */
function SessionBar({
    progress,
    sessions,
}: {
    progress: ReadingProgress;
    sessions: ReadingSession[];
}) {
    const total = progress.pages ?? 0;
    const shades = ['bg-heat-2', 'bg-primary', 'bg-heat-3'];
    const ordered = [...sessions].sort((a, b) => a.page_from - b.page_from);

    if (total === 0 || ordered.length === 0) {
        return (
            <div className="mx-5 h-2.5 overflow-hidden rounded-[3px] bg-elevated">
                <div
                    className="h-full bg-primary"
                    style={{ width: `${progress.percent ?? 0}%` }}
                />
            </div>
        );
    }

    return (
        <div className="mx-5 flex flex-col gap-1.5">
            <div
                role="img"
                aria-label={`${progress.percent ?? 0}% lido em ${plural(ordered.length, 'sessão', 'sessões')}`}
                className="flex h-2.5 gap-0.5 overflow-hidden rounded-[3px] bg-elevated"
            >
                {ordered.map((session, index) => (
                    <span
                        key={session.id}
                        title={`p. ${session.page_from} → ${session.page_to}`}
                        className={shades[index % shades.length]}
                        style={{ width: `${(session.pages / total) * 100}%` }}
                    />
                ))}
            </div>
            <span className="font-mono text-[10px] text-faint">
                cada trecho da barra é uma sessão
            </span>
        </div>
    );
}

function FinishedCard({
    reading,
    sessions,
    pages,
}: {
    reading: NonNullable<BookDetail['reading']>;
    sessions: ReadingSession[];
    pages: number | null;
}) {
    const days =
        reading.started_at && reading.finished_at
            ? Math.round(
                  (new Date(`${reading.finished_at}T12:00:00`).getTime() -
                      new Date(`${reading.started_at}T12:00:00`).getTime()) /
                      86_400_000,
              ) + 1
            : null;

    const details = [
        reading.started_at &&
            reading.finished_at &&
            `${shortDate(reading.started_at)} → ${shortDate(reading.finished_at)}`,
        sessions.length > 0 && plural(sessions.length, 'sessão', 'sessões'),
        days && pages && `${Math.round(pages / days)} págs/dia`,
    ].filter(Boolean);

    return (
        <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border bg-surface px-5 py-4.5">
            <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-active text-heat-3">
                    ✓
                </span>
                <span className="text-[15px] font-semibold">
                    {days ? `Lido em ${plural(days, 'dia', 'dias')}` : 'Lido'}
                </span>
            </div>
            {details.length > 0 && (
                <span className="font-mono text-[13px] text-muted">
                    {details.join(' · ')}
                </span>
            )}
        </section>
    );
}

function ReviewForm({ bookId, review }: { bookId: number; review: string }) {
    const form = useForm({ review });

    function save(event: FormEvent) {
        event.preventDefault();
        form.submit(readingRoute(bookId), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    }

    return (
        <form onSubmit={save} className="flex flex-col gap-2.5 pt-3">
            <label htmlFor="review" className="sr-only">
                Resenha
            </label>
            <Textarea
                id="review"
                value={form.data.review}
                onChange={(event) => form.setData('review', event.target.value)}
                placeholder="O que você achou do livro? Ideias, trechos, impressões."
                className="min-h-36 leading-relaxed"
            />
            <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-faint">
                    {form.recentlySuccessful
                        ? 'salvo'
                        : form.isDirty
                          ? 'alterações não salvas'
                          : 'markdown'}
                </span>
                <Button
                    type="submit"
                    variant="ghost"
                    disabled={!form.isDirty || form.processing}
                >
                    {form.processing ? 'Salvando…' : 'Salvar resenha'}
                </Button>
            </div>
        </form>
    );
}
