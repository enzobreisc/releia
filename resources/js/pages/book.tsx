import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BookCover } from '@/components/book-cover';
import { BookEditor } from '@/components/book-editor';
import { BookNotes } from '@/components/book-notes';
import { Button, Textarea } from '@/components/form';
import { SectionTitle } from '@/components/page-header';
import { QueueButton } from '@/components/queue-button';
import {
    AbandonDialog,
    BackToReadingDialog,
    CorrectDialog,
    DatesDialog,
    DeleteReadingDialog,
    FinishDialog,
    RemoveBookDialog,
    RereadDialog,
} from '@/components/reading-dialogs';
import type { Removal } from '@/components/reading-dialogs';
import { SessionForm } from '@/components/session-form';
import { SessionLog } from '@/components/session-log';
import { StarRating } from '@/components/star-rating';
import { STATUS_LABELS, StatusIcon, StatusMenu } from '@/components/status';
import type { Status } from '@/components/status';
import { monthYear, plural, shortDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import {
    reading as readingRoute,
    shopping as shoppingRoute,
} from '@/routes/books';
import { index as libraryIndex } from '@/routes/library';
import { show as authorShow } from '@/routes/authors';
import type {
    BookDetail,
    Candidate,
    ReadingHistory,
    ReadingProgress,
    ReadingSession,
} from '@/types';
import type { NoteCard } from '@/types/notes';

type BookProps = {
    book: BookDetail;
    slug: string;
    progress: ReadingProgress | null;
    sessions: ReadingSession[];
    can_log: boolean;
    readings: ReadingHistory[];
    notes: NoteCard[];
    queue_position: number | null;
    removal: Removal;
    genres: string[];
    lookup?: Candidate | null;
};

type Tab = 'sessions' | 'notes' | 'review' | 'readings';

type DialogState =
    | { kind: 'finish' | 'abandon' | 'reread' | 'back' | 'correct' | 'remove' }
    | { kind: 'dates' | 'deleteReading'; reading: ReadingHistory };

const options = { preserveScroll: true, preserveState: true };

export default function Book({
    book,
    slug,
    progress,
    sessions,
    can_log,
    readings,
    notes,
    queue_position,
    removal,
    genres,
    lookup,
}: BookProps) {
    const status = (book.reading?.status ?? 'want_to_read') as Status;
    const current = readings.at(-1) ?? null;
    const previous =
        readings
            .slice(0, -1)
            .filter((item) => item.status === 'read')
            .at(-1) ?? null;
    const [tab, setTab] = useState<Tab>(
        status === 'read' ? 'review' : 'sessions',
    );
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [editing, setEditing] = useState(false);
    const close = () => setDialog(null);

    // ⌘E abre a edição dos dados.
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.metaKey && event.key.toLowerCase() === 'e') {
                event.preventDefault();
                setEditing(true);
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    function setStatus(next: Status) {
        router.patch(readingRoute.url(book.id), { status: next }, options);
    }

    // Estante pelo menu: o que pede dados abre um painel; o resto muda na hora, com desfazer.
    function pickStatus(next: Status) {
        if (status === 'read' && next === 'reading') {
            setDialog({ kind: 'back' });
        } else if (next === 'read') {
            setDialog({ kind: 'finish' });
        } else if (next === 'abandoned') {
            setDialog({ kind: 'abandon' });
        } else {
            setStatus(next);
        }
    }

    const primary: Record<Status, { label: string; run: () => void }> = {
        want_to_read: {
            label: 'Começar a ler',
            run: () => setStatus('reading'),
        },
        reading: {
            label: 'Terminei',
            run: () => setDialog({ kind: 'finish' }),
        },
        read: {
            label: 'Ler de novo',
            run: () => setDialog({ kind: 'reread' }),
        },
        abandoned: { label: 'Retomar', run: () => setStatus('reading') },
    };

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
        { id: 'readings', label: 'Leituras', count: readings.length },
    ];

    const number = current?.number ?? 1;

    return (
        <>
            <Head title={book.title} />
            <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-[13px] text-muted">
                    <Link href={libraryIndex.url()} className="hover:text-text">
                        releia <span className="text-faint">/</span> biblioteca
                    </Link>{' '}
                    <span className="text-faint">/</span> {slug}
                </div>
                <span className="font-mono text-[11px] text-faint">
                    ⌘E edita
                </span>
            </div>

            <div className="flex flex-wrap items-start gap-8">
                <BookCover
                    src={book.cover_url}
                    title={book.title}
                    className="w-42 border-strong shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
                />
                <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3.5">
                    <div className="flex flex-col gap-1.5">
                        {number > 1 && previous && (
                            <span className="self-start rounded-full bg-elevated px-2.5 py-1 font-mono text-[11px] text-nav">
                                ↻ {number}ª leitura · a {previous.number}ª foi
                                em{' '}
                                {previous.finished_at
                                    ? monthYear(previous.finished_at)
                                    : '—'}
                                {previous.rating ? `, ★${previous.rating}` : ''}
                            </span>
                        )}
                        <h1 className="font-mono text-[34px] leading-tight font-bold">
                            {book.title}
                        </h1>
                        {book.subtitle && (
                            <p className="text-[15px] text-muted">
                                {book.subtitle}
                            </p>
                        )}
                        <p className="text-base text-nav">
                            {book.author_links.length === 0
                                ? 'Autor desconhecido'
                                : book.author_links.map((author, index) => (
                                      <span key={author.id}>
                                          {index > 0 && ', '}
                                          <Link
                                              href={authorShow.url(author.id)}
                                              className="hover:text-accent hover:underline"
                                          >
                                              {author.name}
                                          </Link>
                                      </span>
                                  ))}
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

                    <div className="flex flex-wrap items-center gap-2.5">
                        <StatusMenu
                            status={status}
                            label={
                                status === 'want_to_read' && number > 1
                                    ? 'Quero reler'
                                    : STATUS_LABELS[status]
                            }
                            onPick={pickStatus}
                        />
                        {(status === 'read' || status === 'abandoned') && (
                            <StarRating
                                value={book.reading?.rating ?? null}
                                onChange={(rating) =>
                                    router.patch(
                                        readingRoute.url(book.id),
                                        { rating },
                                        options,
                                    )
                                }
                                size={20}
                            />
                        )}
                        <div className="ml-auto flex gap-2">
                            <Button
                                onClick={primary[status].run}
                                className="h-10"
                            >
                                {primary[status].label}
                            </Button>
                            {status === 'want_to_read' && (
                                <QueueButton
                                    bookId={book.id}
                                    position={queue_position}
                                    className="h-10"
                                />
                            )}
                            <MoreMenu>
                                {(closeMenu) => (
                                    <>
                                        <MenuItem
                                            onClick={() => {
                                                closeMenu();
                                                setEditing(true);
                                            }}
                                            hint="⌘E"
                                        >
                                            Editar dados do livro
                                        </MenuItem>
                                        {status === 'want_to_read' &&
                                            readings.length <= 1 &&
                                            sessions.length === 0 &&
                                            notes.length === 0 && (
                                                <MenuItem
                                                    onClick={() => {
                                                        closeMenu();
                                                        router.post(
                                                            shoppingRoute.url(
                                                                book.id,
                                                            ),
                                                        );
                                                    }}
                                                >
                                                    Mover para compras
                                                </MenuItem>
                                            )}
                                        {current &&
                                            status !== 'want_to_read' && (
                                                <MenuItem
                                                    onClick={() => {
                                                        closeMenu();
                                                        setDialog({
                                                            kind: 'dates',
                                                            reading: current,
                                                        });
                                                    }}
                                                >
                                                    Editar datas da leitura
                                                </MenuItem>
                                            )}
                                        {status === 'read' && (
                                            <MenuItem
                                                onClick={() => {
                                                    closeMenu();
                                                    setDialog({
                                                        kind: 'correct',
                                                    });
                                                }}
                                            >
                                                Desmarcar como lido…
                                            </MenuItem>
                                        )}
                                        <div className="mx-1.5 my-1 h-px bg-border" />
                                        <MenuItem
                                            danger
                                            onClick={() => {
                                                closeMenu();
                                                setDialog({ kind: 'remove' });
                                            }}
                                        >
                                            Remover da biblioteca…
                                        </MenuItem>
                                    </>
                                )}
                            </MoreMenu>
                        </div>
                    </div>

                    {book.description && (
                        <Description text={book.description} />
                    )}
                </div>
            </div>

            {status === 'want_to_read' && (
                <section className="flex flex-wrap items-center gap-4 rounded-md border border-dashed border-strong p-5">
                    <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                        <p className="text-[15px] font-semibold">
                            {number > 1
                                ? 'Releitura planejada'
                                : 'Ainda não começou'}
                        </p>
                        <p className="text-[13px] text-muted">
                            {progress?.pages && progress.pace
                                ? `No seu ritmo (${Math.round(progress.pace)} págs/dia), ${progress.pages} páginas levam ~${plural(Math.ceil((progress.pages - progress.current_page) / progress.pace), 'dia', 'dias')}. `
                                : ''}
                            {queue_position !== null
                                ? `Está em ${queue_position}º na fila.`
                                : 'Fora da fila.'}
                            {progress &&
                                progress.current_page > 0 &&
                                ` Parou na p. ${progress.current_page}; ao começar, continua dela.`}
                        </p>
                    </div>
                </section>
            )}

            {status === 'reading' && progress && current && (
                <ProgressCard
                    bookId={book.id}
                    reading={current}
                    progress={progress}
                    canLog={can_log}
                    onFinish={() => setDialog({ kind: 'finish' })}
                    onEditDates={() =>
                        setDialog({ kind: 'dates', reading: current })
                    }
                />
            )}

            {status === 'read' && current && (
                <ClosedCard
                    tone="read"
                    title={
                        current.days
                            ? `Lido em ${plural(current.days, 'dia', 'dias')}`
                            : 'Lido'
                    }
                    reading={current}
                    onEditDates={() =>
                        setDialog({ kind: 'dates', reading: current })
                    }
                    extra={
                        current.rating === null && (
                            <span className="text-[13px] text-warn">
                                sem nota ainda: dê estrelas acima
                            </span>
                        )
                    }
                />
            )}

            {status === 'abandoned' && current && (
                <ClosedCard
                    tone="abandoned"
                    title={`Abandonado na p. ${current.current_page}${book.pages ? ` de ${book.pages}` : ''}`}
                    reading={current}
                    onEditDates={() =>
                        setDialog({ kind: 'dates', reading: current })
                    }
                    extra={
                        <span className="text-[13px] text-muted">
                            motivo: {current.abandon_reason ?? 'não informado'}
                        </span>
                    }
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

                {tab === 'sessions' && (
                    <SessionLog
                        sessions={sessions}
                        emptyText={
                            number > 1
                                ? 'Nenhuma sessão nesta leitura. Registre a página em que você parou.'
                                : undefined
                        }
                    />
                )}
                {tab === 'notes' && (
                    <BookNotes bookId={book.id} notes={notes} />
                )}
                {/* A resenha fica montada: o rascunho não se perde ao trocar de aba. */}
                <div hidden={tab !== 'review'}>
                    <ReviewForm
                        key={current?.id ?? 'none'}
                        bookId={book.id}
                        review={book.reading?.review ?? ''}
                        label={`${number}ª leitura`}
                        active={tab === 'review'}
                    />
                </div>
                {tab === 'readings' && (
                    <ReadingsTab
                        readings={readings}
                        pages={book.pages}
                        onEditDates={(reading) =>
                            setDialog({ kind: 'dates', reading })
                        }
                        onDelete={(reading) =>
                            setDialog({ kind: 'deleteReading', reading })
                        }
                    />
                )}
            </section>

            <p className="font-mono text-[11px] text-faint">
                dados: {book.source_label}
            </p>

            {dialog?.kind === 'finish' && current && (
                <FinishDialog
                    title={book.title}
                    reading={current}
                    previous={previous}
                    onClose={close}
                />
            )}
            {dialog?.kind === 'abandon' && current && (
                <AbandonDialog
                    title={book.title}
                    reading={current}
                    pages={book.pages}
                    onClose={close}
                />
            )}
            {dialog?.kind === 'reread' && (
                <RereadDialog bookId={book.id} onClose={close} />
            )}
            {dialog?.kind === 'back' && current && (
                <BackToReadingDialog
                    title={book.title}
                    reading={current}
                    onReread={() => setDialog({ kind: 'reread' })}
                    onCorrect={() => setDialog({ kind: 'correct' })}
                    onClose={close}
                />
            )}
            {dialog?.kind === 'correct' && current && (
                <CorrectDialog reading={current} onClose={close} />
            )}
            {dialog?.kind === 'dates' && (
                <DatesDialog reading={dialog.reading} onClose={close} />
            )}
            {dialog?.kind === 'deleteReading' && (
                <DeleteReadingDialog
                    reading={dialog.reading}
                    title={book.title}
                    onClose={close}
                />
            )}
            {dialog?.kind === 'remove' && (
                <RemoveBookDialog
                    bookId={book.id}
                    title={book.title}
                    removal={removal}
                    queued={queue_position !== null}
                    onClose={close}
                />
            )}
            {editing && (
                <BookEditor
                    book={book}
                    genres={genres}
                    lookup={lookup}
                    onClose={() => setEditing(false)}
                    onShowSessions={() => {
                        setEditing(false);
                        setTab('sessions');
                    }}
                />
            )}
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
function MoreMenu({
    children,
}: {
    children: (close: () => void) => ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        function onMouseDown(event: MouseEvent) {
            if (!ref.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-label="Mais ações"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
                className="size-10 rounded-sm border bg-surface text-base text-nav hover:bg-active hover:text-text"
            >
                ⋯
            </button>
            {open && (
                <div
                    role="menu"
                    className="absolute top-12 right-0 z-30 flex w-64 flex-col gap-0.5 rounded-[10px] border border-strong bg-surface p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.55)]"
                >
                    {children(() => setOpen(false))}
                </div>
            )}
        </div>
    );
}

function MenuItem({
    children,
    onClick,
    hint,
    danger = false,
}: {
    children: string;
    onClick: () => void;
    hint?: string;
    danger?: boolean;
}) {
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={cn(
                'flex items-center justify-between rounded-sm px-2.5 py-2.5 text-left text-sm',
                danger
                    ? 'text-danger hover:bg-danger-fill/15'
                    : 'hover:bg-active',
            )}
        >
            {children}
            {hint && (
                <span className="font-mono text-[11px] text-faint">{hint}</span>
            )}
        </button>
    );
}

function ProgressCard({
    bookId,
    reading,
    progress,
    canLog,
    onFinish,
    onEditDates,
}: {
    bookId: number;
    reading: ReadingHistory;
    progress: ReadingProgress;
    canLog: boolean;
    onFinish: () => void;
    onEditDates: () => void;
}) {
    const finishesOn =
        progress.days_left === null
            ? null
            : (() => {
                  const date = new Date();
                  date.setDate(date.getDate() + progress.days_left);

                  return shortDate(
                      `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
                  );
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
        { label: 'sessões', value: String(reading.sessions_count) },
    ];

    return (
        <section
            aria-label="Progresso"
            className="flex flex-col rounded-md border bg-surface"
        >
            <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-4.5 pb-3.5">
                <div className="flex flex-col gap-1">
                    <SectionTitle>
                        {reading.number > 1
                            ? `progresso · ${reading.number}ª leitura`
                            : 'progresso'}
                    </SectionTitle>
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
                    <div>
                        <dt className="font-mono text-[11px] text-muted">
                            começou
                        </dt>
                        <dd className="mt-0.5">
                            <button
                                type="button"
                                onClick={onEditDates}
                                title="Editar data de início"
                                className="font-mono text-[15px] font-bold hover:text-accent"
                            >
                                {reading.started_at
                                    ? shortDate(reading.started_at)
                                    : '—'}{' '}
                                <span className="text-xs font-medium text-accent">
                                    ✎
                                </span>
                            </button>
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="mx-5 h-2.5 overflow-hidden rounded-[3px] bg-elevated">
                <div
                    className="h-full bg-primary"
                    style={{ width: `${progress.percent ?? 0}%` }}
                />
            </div>

            {progress.finish_suggested && (
                <div className="mx-5 mt-3.5 flex flex-wrap items-center gap-3 rounded-sm border border-primary bg-active px-3.5 py-3 text-sm">
                    <span className="flex-1">Você chegou à última página.</span>
                    <Button onClick={onFinish} className="h-9 text-[13px]">
                        Terminar e avaliar
                    </Button>
                </div>
            )}

            <div className="mt-4 rounded-b-md border-t bg-[#0d131c] px-5 py-3.5">
                {canLog ? (
                    <SessionForm bookId={bookId} progress={progress} />
                ) : (
                    <p className="text-sm text-muted">
                        Para registrar sessões, a leitura precisa estar em
                        andamento.
                    </p>
                )}
            </div>
        </section>
    );
}

/** Cartão de leitura fechada: lida ou abandonada, com as datas editáveis. */
function ClosedCard({
    tone,
    title,
    reading,
    extra,
    onEditDates,
}: {
    tone: 'read' | 'abandoned';
    title: string;
    reading: ReadingHistory;
    extra?: ReactNode;
    onEditDates: () => void;
}) {
    const details = [
        plural(reading.sessions_count, 'sessão', 'sessões'),
        reading.pages_per_day !== null &&
            tone === 'read' &&
            `${Math.round(reading.pages_per_day)} págs/dia`,
    ].filter(Boolean);

    return (
        <section
            className={cn(
                'flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border bg-surface px-5 py-4.5',
                tone === 'abandoned' && 'border-warn-line',
            )}
        >
            <div className="flex items-center gap-2.5">
                <StatusIcon status={tone} size={26} />
                <span className="text-[15px] font-semibold">{title}</span>
            </div>
            <button
                type="button"
                onClick={onEditDates}
                title="Editar datas"
                className="font-mono text-[13px] text-nav hover:text-text"
            >
                {reading.started_at ? shortDate(reading.started_at) : '—'} →{' '}
                {reading.finished_at ? shortDate(reading.finished_at) : '—'}{' '}
                <span className="text-accent">✎</span>
            </button>
            <span className="font-mono text-[13px] text-muted">
                {details.join(' · ')}
            </span>
            {extra}
        </section>
    );
}

function ReviewForm({
    bookId,
    review,
    label,
    active,
}: {
    bookId: number;
    review: string;
    label: string;
    active: boolean;
}) {
    const form = useForm({ review });

    function save(event?: FormEvent) {
        event?.preventDefault();

        if (!form.isDirty || form.processing) {
            return;
        }

        form.submit(readingRoute(bookId), {
            preserveScroll: true,
            onSuccess: () => form.setDefaults(),
        });
    }

    // ⌘S salva a resenha enquanto a aba está aberta.
    useEffect(() => {
        if (!active) {
            return;
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.metaKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                save();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    });

    return (
        <form onSubmit={save} className="flex flex-col gap-2.5 pt-3">
            <span className="font-mono text-[11px] text-muted">
                resenha · {label} · cada leitura tem a sua
            </span>
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
                <span
                    className={cn(
                        'font-mono text-[11px]',
                        form.isDirty ? 'text-warn' : 'text-faint',
                    )}
                >
                    {form.recentlySuccessful
                        ? 'salvo'
                        : form.isDirty
                          ? 'alterações não salvas · ⌘S salva'
                          : 'markdown · ⌘S salva'}
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

/** Aba Leituras: o histórico do livro, a mais recente primeiro, com a comparação. */
function ReadingsTab({
    readings,
    pages,
    onEditDates,
    onDelete,
}: {
    readings: ReadingHistory[];
    pages: number | null;
    onEditDates: (reading: ReadingHistory) => void;
    onDelete: (reading: ReadingHistory) => void;
}) {
    const [open, setOpen] = useState<number | null>(null);
    const finished = readings.filter((item) => item.status === 'read');

    return (
        <div className="flex flex-col gap-2 pt-3">
            {finished.length >= 2 && <Comparison readings={finished} />}

            {[...readings].reverse().map((item) => {
                const expanded = open === item.id;
                const detail =
                    item.status === 'want_to_read'
                        ? 'ainda não começou'
                        : item.status === 'reading'
                          ? `desde ${item.started_at ? shortDate(item.started_at) : '—'} · p. ${item.current_page}${pages ? ` de ${pages}` : ''}`
                          : [
                                item.started_at && item.finished_at
                                    ? `${shortDate(item.started_at)} → ${shortDate(item.finished_at)} ${item.finished_at.slice(0, 4)}`
                                    : null,
                                item.days && plural(item.days, 'dia', 'dias'),
                                plural(
                                    item.sessions_count,
                                    'sessão',
                                    'sessões',
                                ),
                                item.abandon_reason &&
                                    `motivo: ${item.abandon_reason}`,
                            ]
                                .filter(Boolean)
                                .join(' · ');

                return (
                    <article
                        key={item.id}
                        className={cn(
                            'flex flex-col rounded-md border bg-surface',
                            item.id === readings.at(-1)?.id && 'border-primary',
                        )}
                    >
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5">
                            <span className="font-mono text-[13px] font-bold">
                                {item.number}ª leitura
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-[13px]">
                                <StatusIcon status={item.status} size={10} />
                                {item.status_label}
                            </span>
                            <span className="min-w-0 flex-1 font-mono text-xs text-nav">
                                {detail}
                            </span>
                            {item.rating !== null && (
                                <span
                                    aria-label={`Nota ${item.rating} de 5`}
                                    className="font-mono text-xs text-accent"
                                >
                                    {'★'.repeat(item.rating)}
                                </span>
                            )}
                            <span className="flex gap-3 text-xs">
                                {(item.sessions_count > 0 || item.review) && (
                                    <button
                                        type="button"
                                        aria-expanded={expanded}
                                        onClick={() =>
                                            setOpen(expanded ? null : item.id)
                                        }
                                        className="text-accent hover:underline"
                                    >
                                        {expanded
                                            ? 'fechar'
                                            : 'sessões e resenha ›'}
                                    </button>
                                )}
                                {item.status !== 'want_to_read' && (
                                    <button
                                        type="button"
                                        onClick={() => onEditDates(item)}
                                        className="text-muted hover:text-text"
                                    >
                                        datas
                                    </button>
                                )}
                                {readings.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(item)}
                                        className="text-muted hover:text-danger"
                                    >
                                        apagar
                                    </button>
                                )}
                            </span>
                        </div>
                        {expanded && (
                            <div className="flex flex-col gap-3 border-t px-4 pt-1 pb-4">
                                <SessionLog sessions={item.sessions} readOnly />
                                {item.review && (
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-[11px] text-muted">
                                            ## resenha
                                        </span>
                                        <p className="text-sm leading-relaxed whitespace-pre-line text-[#c9d3e3]">
                                            {item.review}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}

/** Leituras terminadas lado a lado: duração, ritmo, sessões e nota. Só com você mesmo. */
function Comparison({ readings }: { readings: ReadingHistory[] }) {
    const rows: { label: string; value: (item: ReadingHistory) => string }[] = [
        {
            label: 'duração',
            value: (item) =>
                item.days ? plural(item.days, 'dia', 'dias') : '—',
        },
        {
            label: 'ritmo',
            value: (item) =>
                item.pages_per_day
                    ? `${Math.round(item.pages_per_day)} págs/dia`
                    : '—',
        },
        { label: 'sessões', value: (item) => String(item.sessions_count) },
        {
            label: 'nota',
            value: (item) => (item.rating ? '★'.repeat(item.rating) : '—'),
        },
    ];

    return (
        <div
            className="grid gap-x-4 gap-y-2 rounded-md border bg-surface px-4 py-3.5 font-mono text-xs"
            style={{
                gridTemplateColumns: `110px repeat(${readings.length}, minmax(0, 1fr))`,
            }}
        >
            <span />
            {readings.map((item) => (
                <span key={item.id} className="text-muted">
                    {item.number}ª ·{' '}
                    {item.finished_at ? monthYear(item.finished_at) : '—'}
                </span>
            ))}
            {rows.map((row) => (
                <ComparisonRow
                    key={row.label}
                    label={row.label}
                    values={readings.map(row.value)}
                />
            ))}
        </div>
    );
}

function ComparisonRow({ label, values }: { label: string; values: string[] }) {
    return (
        <>
            <span className="text-muted">{label}</span>
            {values.map((value, index) => (
                <span key={index}>{value}</span>
            ))}
        </>
    );
}
