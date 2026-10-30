import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { BookCover } from '@/components/book-cover';
import { BookEditor } from '@/components/book-editor';
import { BookNotes } from '@/components/book-notes';
import { cardClass } from '@/components/card';
import { Button, Textarea } from '@/components/form';
import { MenuItem, MenuSeparator, MoreMenu } from '@/components/menu';
import { DisplayTitle, SectionTitle } from '@/components/page-header';
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
import { STATUS_LABELS } from '@/components/status';
import type { Status } from '@/components/status';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
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
    Option,
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
    note_kinds: Option[];
    queue_position: number | null;
    removal: Removal;
    genres: string[];
    lookup?: Candidate | null;
};

type Tab = 'sessions' | 'notes' | 'review';

type DialogState =
    | { kind: 'finish' | 'abandon' | 'reread' | 'back' | 'correct' | 'remove' }
    | { kind: 'dates' | 'deleteReading'; reading: ReadingHistory };

const options = { preserveScroll: true, preserveState: true };

const STATUS_ORDER: Status[] = ['want_to_read', 'reading', 'read', 'abandoned'];

const STATUS_DOT: Record<string, string> = {
    want_to_read: 'bg-muted',
    reading: 'bg-accent',
    read: 'bg-text',
    abandoned: 'bg-warn',
};

const FILLED_STAR_COUNT = 5;

export default function Book({
    book,
    progress,
    sessions,
    can_log,
    readings,
    notes,
    note_kinds,
    queue_position,
    removal,
    genres,
    lookup,
}: BookProps) {
    const { t, plural, monthYear, translateText, ordinal } = useTranslation();
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

    function pickStatus(next: Status) {
        if (next === status) {
            return;
        }

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

    const primary: Record<Status, { label: TranslationKey; run: () => void }> =
        {
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

    const facts = [
        book.pages && t(':pages págs', { pages: book.pages }),
        book.publisher,
        book.published_year,
        book.genre && translateText(book.genre),
        book.isbn_13 && `ISBN ${book.isbn_13}`,
    ].filter(Boolean);

    const tabs: { id: Tab; label: TranslationKey; count?: number }[] = [
        { id: 'sessions', label: 'Sessões', count: sessions.length },
        { id: 'notes', label: 'Notas', count: notes.length },
        { id: 'review', label: 'Resenha' },
    ];

    const number = current?.number ?? 1;
    const canMoveToShopping =
        status === 'want_to_read' &&
        readings.length <= 1 &&
        sessions.length === 0 &&
        notes.length === 0;

    return (
        <div className="flex max-w-270 flex-col gap-12">
            <Head title={book.title} />
            <div className="flex flex-wrap justify-between gap-3 text-[13px] font-semibold text-muted">
                <span>
                    <Link
                        href={libraryIndex.url()}
                        className="text-secondary hover:text-text"
                    >
                        {t('Biblioteca')}
                    </Link>{' '}
                    <span aria-hidden="true">/</span>{' '}
                    <span className="text-text">{book.title}</span>
                </span>
                <span className="font-mono text-[11px]">{t('⌘E edita')}</span>
            </div>

            <header className="flex flex-wrap items-end gap-12">
                <BookCover
                    src={book.cover_url}
                    title={book.title}
                    className="w-60 shadow-hero"
                />
                <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-4.5 pb-1">
                    {number > 1 && previous && (
                        <span className="inline-flex h-7.5 items-center gap-2 self-start rounded-full bg-elevated px-3 text-xs font-bold text-secondary inset-ring inset-ring-strong">
                            <span className="font-mono">↻</span>
                            {t(':ordinal leitura · a :previous foi em :date', {
                                ordinal: ordinal(number, 'feminine'),
                                previous: ordinal(previous.number, 'feminine'),
                                date: previous.finished_at
                                    ? monthYear(previous.finished_at)
                                    : '—',
                            })}
                            {previous.rating ? `, ★${previous.rating}` : ''}
                        </span>
                    )}
                    <div className="flex flex-col gap-2.5">
                        <DisplayTitle>{book.title}</DisplayTitle>
                        {book.subtitle && (
                            <p className="text-[17px] font-medium text-muted">
                                {book.subtitle}
                            </p>
                        )}
                        <p className="text-xl font-semibold text-secondary">
                            {book.author_links.length === 0
                                ? t('Autor desconhecido')
                                : book.author_links.map((author, index) => (
                                      <span key={author.id}>
                                          {index > 0 && ', '}
                                          <Link
                                              href={authorShow.url(author.id)}
                                              className="hover:text-link hover:underline"
                                          >
                                              {author.name}
                                          </Link>
                                      </span>
                                  ))}
                        </p>
                    </div>

                    {facts.length > 0 && (
                        <p className="flex flex-wrap gap-x-4.5 gap-y-1.5 font-mono text-xs text-muted">
                            {facts.map((fact, index) => (
                                <span key={index}>{fact}</span>
                            ))}
                        </p>
                    )}

                    <div className="relative mt-1 flex flex-wrap items-center gap-3">
                        <Button
                            onClick={primary[status].run}
                            className="h-12 px-6.5 text-[15px]"
                        >
                            {t(primary[status].label)}
                        </Button>
                        <PillGroup role="radiogroup" label={t('Mover para')}>
                            {STATUS_ORDER.filter(
                                (value) =>
                                    !(
                                        status === 'read' &&
                                        value === 'abandoned'
                                    ),
                            ).map((value) => (
                                <PillOption
                                    key={value}
                                    role="radio"
                                    selected={value === status}
                                    onClick={() => pickStatus(value)}
                                >
                                    <span
                                        className={cn(
                                            'size-1.5 rounded-full',
                                            value === status
                                                ? STATUS_DOT[value]
                                                : 'bg-strong',
                                        )}
                                    />
                                    {value === 'want_to_read' && number > 1
                                        ? t('Quero reler')
                                        : t(STATUS_LABELS[value])}
                                </PillOption>
                            ))}
                        </PillGroup>
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
                                size={22}
                            />
                        )}
                        {status === 'want_to_read' && (
                            <QueueButton
                                bookId={book.id}
                                position={queue_position}
                                className="h-12"
                            />
                        )}
                        <MoreMenu triggerClassName="size-12 text-lg text-text inset-ring inset-ring-strong">
                            {(closeMenu) => (
                                <>
                                    <MenuItem
                                        onClick={() => {
                                            closeMenu();
                                            setEditing(true);
                                        }}
                                        hint="⌘E"
                                    >
                                        {t('Editar dados do livro')}
                                    </MenuItem>
                                    {current && status !== 'want_to_read' && (
                                        <MenuItem
                                            onClick={() => {
                                                closeMenu();
                                                setDialog({
                                                    kind: 'dates',
                                                    reading: current,
                                                });
                                            }}
                                        >
                                            {t('Editar datas da leitura')}
                                        </MenuItem>
                                    )}
                                    {canMoveToShopping && (
                                        <MenuItem
                                            onClick={() => {
                                                closeMenu();
                                                router.post(
                                                    shoppingRoute.url(book.id),
                                                );
                                            }}
                                        >
                                            {t('Mover para compras')}
                                        </MenuItem>
                                    )}
                                    {status === 'read' && (
                                        <MenuItem
                                            onClick={() => {
                                                closeMenu();
                                                setDialog({ kind: 'correct' });
                                            }}
                                        >
                                            {t('Desmarcar como lido…')}
                                        </MenuItem>
                                    )}
                                    <MenuSeparator />
                                    <MenuItem
                                        danger
                                        onClick={() => {
                                            closeMenu();
                                            setDialog({ kind: 'remove' });
                                        }}
                                    >
                                        {t('Remover da biblioteca…')}
                                    </MenuItem>
                                </>
                            )}
                        </MoreMenu>
                    </div>
                </div>
            </header>

            {book.description && <Description text={book.description} />}

            {status === 'want_to_read' && (
                <section className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-strong p-6">
                    <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                        <p className="text-[15px] font-bold">
                            {number > 1
                                ? t('Releitura planejada')
                                : t('Ainda não começou')}
                        </p>
                        <p className="text-[13px] font-medium text-muted">
                            {progress?.pages && progress.pace
                                ? `${t(
                                      'No seu ritmo (:pace págs/dia), :pages páginas levam ~:duration.',
                                      {
                                          pace: Math.round(progress.pace),
                                          pages: progress.pages,
                                          duration: plural(
                                              Math.ceil(
                                                  (progress.pages -
                                                      progress.current_page) /
                                                      progress.pace,
                                              ),
                                              'dia',
                                              'dias',
                                          ),
                                      },
                                  )} `
                                : ''}
                            {queue_position !== null
                                ? t('Está em :position na fila.', {
                                      position: ordinal(queue_position),
                                  })
                                : t('Fora da fila.')}
                            {progress &&
                                progress.current_page > 0 &&
                                ` ${t('Parou na p. :page; ao começar, continua dela.', { page: progress.current_page })}`}
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
                            ? t('Lido em :duration', {
                                  duration: plural(current.days, 'dia', 'dias'),
                              })
                            : t('Lido')
                    }
                    reading={current}
                    onEditDates={() =>
                        setDialog({ kind: 'dates', reading: current })
                    }
                    extra={
                        current.rating === null && (
                            <span className="text-[13px] font-semibold text-warn">
                                {t('sem nota ainda: dê estrelas acima')}
                            </span>
                        )
                    }
                />
            )}

            {status === 'abandoned' && current && (
                <ClosedCard
                    tone="abandoned"
                    title={
                        book.pages
                            ? t('Abandonado na p. :page de :pages', {
                                  page: current.current_page,
                                  pages: book.pages,
                              })
                            : t('Abandonado na p. :page', {
                                  page: current.current_page,
                              })
                    }
                    reading={current}
                    onEditDates={() =>
                        setDialog({ kind: 'dates', reading: current })
                    }
                    extra={
                        <span className="text-[13px] font-semibold text-muted">
                            {t('motivo: :reason', {
                                reason:
                                    current.abandon_reason ??
                                    t('não informado'),
                            })}
                        </span>
                    }
                />
            )}

            <section
                aria-label={t('Sessões, notas e resenha')}
                className="flex flex-col gap-5"
            >
                <PillGroup role="tablist" label={t('Sessões, notas e resenha')}>
                    {tabs.map((item) => (
                        <PillOption
                            key={item.id}
                            role="tab"
                            selected={tab === item.id}
                            onClick={() => setTab(item.id)}
                            className="px-4.5 text-sm"
                        >
                            {t(item.label)}
                            {item.count !== undefined && (
                                <span className="font-mono text-[11px] font-normal opacity-75">
                                    {item.count}
                                </span>
                            )}
                        </PillOption>
                    ))}
                </PillGroup>

                {tab === 'sessions' && (
                    <SessionLog
                        sessions={sessions}
                        emptyText={
                            number > 1
                                ? t(
                                      'Nenhuma sessão nesta leitura. Registre a página em que você parou.',
                                  )
                                : undefined
                        }
                    />
                )}
                {tab === 'notes' && (
                    <BookNotes
                        bookId={book.id}
                        notes={notes}
                        kinds={note_kinds}
                    />
                )}
                {/* The review stays mounted so the draft survives tab switches. */}
                <div hidden={tab !== 'review'}>
                    <ReviewForm
                        key={current?.id ?? 'none'}
                        bookId={book.id}
                        review={book.reading?.review ?? ''}
                        label={ordinal(number, 'feminine')}
                        active={tab === 'review'}
                    />
                </div>
            </section>

            <ReadingsSection
                readings={readings}
                pages={book.pages}
                onEditDates={(reading) => setDialog({ kind: 'dates', reading })}
                onDelete={(reading) =>
                    setDialog({ kind: 'deleteReading', reading })
                }
            />

            <footer className="border-t border-border pt-4.5 font-mono text-[11px] text-faint">
                {t('dados: :source', { source: book.source_label })}
            </footer>

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
        </div>
    );
}

function PillGroup({
    role,
    label,
    children,
}: {
    role: 'radiogroup' | 'tablist';
    label: string;
    children: ReactNode;
}) {
    return (
        <div
            role={role}
            aria-label={label}
            className="flex flex-wrap self-start rounded-full bg-surface p-1 inset-ring inset-ring-border"
        >
            {children}
        </div>
    );
}

function PillOption({
    role,
    selected,
    onClick,
    className,
    children,
}: {
    role: 'radio' | 'tab';
    selected: boolean;
    onClick: () => void;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            role={role}
            aria-checked={role === 'radio' ? selected : undefined}
            aria-selected={role === 'tab' ? selected : undefined}
            onClick={onClick}
            className={cn(
                'flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold',
                role === 'tab'
                    ? selected
                        ? 'bg-text text-bg'
                        : 'text-secondary hover:text-text'
                    : selected
                      ? 'bg-active text-white'
                      : 'text-muted hover:text-text',
                className,
            )}
        >
            {children}
        </button>
    );
}

function Description({ text }: { text: string }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    return (
        <section
            aria-label={t('Sinopse')}
            className="flex max-w-[72ch] flex-col items-start gap-2.5"
        >
            <p
                className={cn(
                    'text-[17px] leading-[1.65] font-medium whitespace-pre-line text-secondary',
                    !open && 'line-clamp-3',
                )}
            >
                {text}
            </p>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="h-8 text-sm font-bold text-link hover:underline"
            >
                {open ? t('− sinopse curta') : t('+ sinopse completa')}
            </button>
        </section>
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
    const { t, shortDate, ordinal } = useTranslation();
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
            label: t('ritmo'),
            value:
                progress.pace === null
                    ? '—'
                    : t(':pages págs/dia', {
                          pages: Math.round(progress.pace),
                      }),
        },
        {
            label: t('termina'),
            value: finishesOn ? `~${finishesOn}` : '—',
        },
    ];

    return (
        <section
            aria-label={t('Progresso')}
            className={cardClass('flex flex-col gap-6.5 rounded-lg p-7')}
        >
            <div className="flex items-baseline justify-between gap-3">
                <SectionTitle>
                    {t('Progresso da :ordinal leitura', {
                        ordinal: ordinal(reading.number, 'feminine'),
                    })}
                </SectionTitle>
                {progress.percent !== null && (
                    <span className="font-mono text-[13px] text-link">
                        {progress.percent}%
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-3.5">
                <p className="flex items-baseline gap-3">
                    <span className="text-[88px] leading-[0.85] font-extrabold tracking-[-0.05em] tabular-nums">
                        {progress.current_page}
                    </span>
                    {progress.pages !== null && (
                        <span className="text-[22px] font-bold text-faint">
                            / {t(':pages págs', { pages: progress.pages })}
                        </span>
                    )}
                </p>
                <div className="h-2 overflow-hidden rounded-[4px] bg-border">
                    <div
                        className="h-full rounded-[4px] bg-text"
                        style={{ width: `${progress.percent ?? 0}%` }}
                    />
                </div>
            </div>

            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-4">
                {stats.map((stat) => (
                    <Stat key={stat.label} label={stat.label}>
                        {stat.value}
                    </Stat>
                ))}
                <Stat label={t('começou')}>
                    <span className="flex items-baseline gap-2.5">
                        {reading.started_at
                            ? shortDate(reading.started_at)
                            : '—'}
                        <button
                            type="button"
                            onClick={onEditDates}
                            aria-label={t('Editar data de início')}
                            className="text-xs font-bold text-link hover:underline"
                        >
                            {t('editar')}
                        </button>
                    </span>
                </Stat>
                <Stat label={t('sessões')}>{reading.sessions_count}</Stat>
            </dl>

            {progress.finish_suggested && (
                <div className="flex flex-wrap items-center gap-3 rounded-sm bg-active px-4 py-3 text-sm font-semibold inset-ring inset-ring-primary">
                    <span className="flex-1">
                        {t('Você chegou à última página.')}
                    </span>
                    <Button onClick={onFinish} className="h-9 text-[13px]">
                        {t('Terminar e avaliar')}
                    </Button>
                </div>
            )}

            <div id="log" className="border-t border-border pt-5.5">
                {canLog ? (
                    <SessionForm bookId={bookId} progress={progress} />
                ) : (
                    <p className="text-sm font-medium text-muted">
                        {t(
                            'Para registrar sessões, a leitura precisa estar em andamento.',
                        )}
                    </p>
                )}
            </div>
        </section>
    );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="text-xs font-bold text-muted first-letter:uppercase">
                {label}
            </dt>
            <dd className="text-[22px] font-extrabold">{children}</dd>
        </div>
    );
}

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
    const { t, plural, shortDate } = useTranslation();
    const details = [
        plural(reading.sessions_count, 'sessão', 'sessões'),
        reading.pages_per_day !== null &&
            tone === 'read' &&
            t(':pages págs/dia', { pages: Math.round(reading.pages_per_day) }),
    ].filter(Boolean);

    return (
        <section
            className={cardClass(
                cn(
                    'flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg px-6 py-5',
                    tone === 'abandoned' && 'inset-ring-warn-line',
                ),
            )}
        >
            <div className="flex items-center gap-2.5">
                <span
                    aria-hidden="true"
                    className={cn('size-1.5 rounded-full', STATUS_DOT[tone])}
                />
                <span className="text-[15px] font-extrabold">{title}</span>
            </div>
            <button
                type="button"
                onClick={onEditDates}
                title={t('Editar datas')}
                className="font-mono text-[13px] text-secondary hover:text-text"
            >
                {reading.started_at ? shortDate(reading.started_at) : '—'} →{' '}
                {reading.finished_at ? shortDate(reading.finished_at) : '—'}{' '}
                <span className="text-link">✎</span>
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
    const { t } = useTranslation();
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
        <form onSubmit={save} className="flex flex-col gap-3">
            <label
                htmlFor="review"
                className="text-[13px] font-bold text-muted"
            >
                {t('Resenha da :ordinal leitura · cada leitura tem a sua', {
                    ordinal: label,
                })}
            </label>
            <Textarea
                id="review"
                value={form.data.review}
                onChange={(event) => form.setData('review', event.target.value)}
                placeholder={t(
                    'O que você achou do livro? Ideias, trechos, impressões.',
                )}
                className="min-h-44 p-5 text-base leading-[1.6]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                    className={cn(
                        'font-mono text-xs',
                        form.isDirty ? 'text-warn' : 'text-muted',
                    )}
                >
                    {form.recentlySuccessful
                        ? t('salvo')
                        : form.isDirty
                          ? t('alterações não salvas · ⌘S salva')
                          : t('markdown · ⌘S salva')}
                </span>
                <Button
                    type="submit"
                    disabled={!form.isDirty || form.processing}
                >
                    {form.processing ? t('Salvando…') : t('Salvar resenha')}
                </Button>
            </div>
        </form>
    );
}

function ReadingsSection({
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
    const { t, ordinal } = useTranslation();
    const [open, setOpen] = useState<number | null>(null);
    const finished = readings.filter((item) => item.status === 'read');
    const latest = readings.at(-1);

    return (
        <section aria-labelledby="readings" className="flex flex-col gap-3.5">
            <h2 id="readings" className="text-xl font-extrabold tracking-tight">
                {t('Leituras')}
            </h2>
            {finished.length >= 2 && <Comparison readings={finished} />}
            <div className={cardClass('overflow-hidden')}>
                {[...readings].reverse().map((item) => (
                    <ReadingRow
                        key={item.id}
                        reading={item}
                        pages={pages}
                        isCurrent={item.id === latest?.id}
                        expanded={open === item.id}
                        canDelete={readings.length > 1}
                        onToggle={() =>
                            setOpen(open === item.id ? null : item.id)
                        }
                        onEditDates={() => onEditDates(item)}
                        onDelete={() => onDelete(item)}
                    />
                ))}
            </div>
            {latest?.status === 'reading' && latest.number > 1 && (
                <p className="text-[13px] font-semibold text-muted">
                    {t(
                        'Quando a :ordinal leitura terminar, dias, ritmo e nota aparecem lado a lado.',
                        { ordinal: ordinal(latest.number, 'feminine') },
                    )}
                </p>
            )}
        </section>
    );
}

function ReadingRow({
    reading,
    pages,
    isCurrent,
    expanded,
    canDelete,
    onToggle,
    onEditDates,
    onDelete,
}: {
    reading: ReadingHistory;
    pages: number | null;
    isCurrent: boolean;
    expanded: boolean;
    canDelete: boolean;
    onToggle: () => void;
    onEditDates: () => void;
    onDelete: () => void;
}) {
    const { t, plural, shortDate, ordinal } = useTranslation();
    const hasDetails = reading.sessions_count > 0 || reading.review;

    return (
        <article className="border-b border-border last:border-b-0">
            <div className="grid grid-cols-[minmax(100px,1fr)_minmax(100px,0.9fr)_minmax(160px,2fr)_auto] items-center gap-3.5 px-5 py-4 max-md:grid-cols-1">
                <span className="text-[15px] font-extrabold">
                    {t(':ordinal leitura', {
                        ordinal: ordinal(reading.number, 'feminine'),
                    })}
                </span>
                <span className="flex items-center gap-1.75 text-[13px] font-bold text-secondary">
                    <span
                        aria-hidden="true"
                        className={cn(
                            'size-1.5 rounded-full',
                            STATUS_DOT[reading.status],
                        )}
                    />
                    {reading.status_label}
                </span>
                <span className="font-mono text-xs text-muted">
                    {readingDetail(reading, pages, { t, plural, shortDate })}
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold">
                    <ReadingRating reading={reading} isCurrent={isCurrent} />
                    {hasDetails && (
                        <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={onToggle}
                            className="text-link hover:underline"
                        >
                            {expanded ? t('fechar') : t('sessões e resenha ›')}
                        </button>
                    )}
                    {reading.status !== 'want_to_read' && (
                        <button
                            type="button"
                            onClick={onEditDates}
                            className="text-secondary hover:text-text"
                        >
                            {t('datas')}
                        </button>
                    )}
                    {canDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="text-secondary hover:text-danger"
                        >
                            {t('apagar')}
                        </button>
                    )}
                </span>
            </div>
            {expanded && (
                <div className="flex flex-col gap-4 px-5 pb-5">
                    <SessionLog sessions={reading.sessions} readOnly />
                    {reading.review && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold text-muted">
                                {t('Resenha')}
                            </span>
                            <p className="text-sm leading-relaxed font-medium whitespace-pre-line text-secondary">
                                {reading.review}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

function ReadingRating({
    reading,
    isCurrent,
}: {
    reading: ReadingHistory;
    isCurrent: boolean;
}) {
    const { t } = useTranslation();

    if (reading.rating !== null) {
        return (
            <span
                aria-label={t('Nota :rating de 5', { rating: reading.rating })}
                className="text-sm tracking-widest text-text"
            >
                {'★'.repeat(reading.rating)}
                <span className="text-strong">
                    {'★'.repeat(FILLED_STAR_COUNT - reading.rating)}
                </span>
            </span>
        );
    }

    if (isCurrent && reading.status !== 'want_to_read') {
        return <span className="text-muted">{t('sem nota ainda')}</span>;
    }

    return null;
}

function readingDetail(
    reading: ReadingHistory,
    pages: number | null,
    {
        t,
        plural,
        shortDate,
    }: Pick<ReturnType<typeof useTranslation>, 't' | 'plural' | 'shortDate'>,
): string {
    if (reading.status === 'want_to_read') {
        return t('ainda não começou');
    }

    if (reading.status === 'reading') {
        return t('desde :date · p. :page', {
            date: reading.started_at ? shortDate(reading.started_at) : '—',
            page: pages
                ? t(':page de :pages', { page: reading.current_page, pages })
                : reading.current_page,
        });
    }

    return [
        reading.started_at && reading.finished_at
            ? `${shortDate(reading.started_at)} → ${shortDate(reading.finished_at)} ${reading.finished_at.slice(0, 4)}`
            : null,
        reading.days && plural(reading.days, 'dia', 'dias'),
        plural(reading.sessions_count, 'sessão', 'sessões'),
        reading.abandon_reason &&
            t('motivo: :reason', { reason: reading.abandon_reason }),
    ]
        .filter(Boolean)
        .join(' · ');
}

function Comparison({ readings }: { readings: ReadingHistory[] }) {
    const { t, plural, monthYear, ordinal } = useTranslation();
    const rows: {
        label: TranslationKey;
        value: (item: ReadingHistory) => string;
    }[] = [
        {
            label: 'duração',
            value: (item) =>
                item.days ? plural(item.days, 'dia', 'dias') : '—',
        },
        {
            label: 'ritmo',
            value: (item) =>
                item.pages_per_day
                    ? t(':pages págs/dia', {
                          pages: Math.round(item.pages_per_day),
                      })
                    : '—',
        },
        { label: 'sessões', value: (item) => String(item.sessions_count) },
        {
            label: 'Nota',
            value: (item) => (item.rating ? '★'.repeat(item.rating) : '—'),
        },
    ];

    return (
        <div
            className={cardClass(
                'grid gap-x-4 gap-y-2 px-5 py-4 font-mono text-xs',
            )}
            style={{
                gridTemplateColumns: `110px repeat(${readings.length}, minmax(0, 1fr))`,
            }}
        >
            <span />
            {readings.map((item) => (
                <span key={item.id} className="text-muted">
                    {ordinal(item.number, 'feminine')} ·{' '}
                    {item.finished_at ? monthYear(item.finished_at) : '—'}
                </span>
            ))}
            {rows.map((row) => (
                <ComparisonRow
                    key={row.label}
                    label={t(row.label).toLowerCase()}
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
