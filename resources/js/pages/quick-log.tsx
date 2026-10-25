import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { cardClass } from '@/components/card';
import { Button, Field, IconButton, Select } from '@/components/form';
import { heatClass } from '@/components/heat-map';
import { SectionTitle } from '@/components/page-header';
import { StarRating } from '@/components/star-rating';
import { Toaster } from '@/components/toaster';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { reading as readingRoute } from '@/routes/books';
import { books as startBook } from '@/routes/quick-log';
import {
    discard,
    finish,
    pause,
    resume,
    start,
} from '@/routes/quick-log/timer';
import type { ReadingSummary } from '@/types';

type Timer = {
    book_id: number;
    start_page: number;
    elapsed: number;
    paused: boolean;
};

type Saved = {
    hash: string;
    title: string;
    book_id: number;
    page_from: number;
    page_to: number;
    pages: number;
    minutes: number | null;
    streak: number;
    /** The session reached the last page: the book was marked as read. */
    finished: boolean;
    days: number | null;
    /** Next in the queue, to start from here. */
    next: { id: number; title: string } | null;
};

type QuickLogProps = {
    readings: ReadingSummary[];
    available: { id: number; title: string }[];
    timer: Timer | null;
    week: number[];
    streak: number;
    shortcut: string;
    saved: Saved | null;
};

/** Each grid square lights up per minute read; 30 = a full grid. */
const MINUTE_SQUARES = 30;

/** Every fifth lit square is brighter, so minutes are easy to count. */
const BRIGHT_EVERY = 5;

/** Quick page jumps offered when saving a session. */
const PAGE_JUMPS = [5, 10, 20];

/** Option value that starts a book from the "want to read" shelf. */
const START_PREFIX = 'start-';

const pageInputClass =
    'w-28 [appearance:textfield] bg-transparent text-center font-extrabold tracking-tighter tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none';

/** "CmdOrCtrl+Shift+L" becomes "⇧⌘L", as macOS shows it in menus. */
function formatShortcut(shortcut: string) {
    const symbols: Record<string, string> = {
        CmdOrCtrl: '⌘',
        Cmd: '⌘',
        Command: '⌘',
        Ctrl: '⌃',
        Control: '⌃',
        Alt: '⌥',
        Option: '⌥',
        Shift: '⇧',
    };
    const order = ['⌃', '⌥', '⇧', '⌘'];
    const parts = shortcut.split('+');
    const key = parts.pop() ?? '';
    const mods = parts
        .map((part) => symbols[part] ?? part)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b));

    return `${mods.join('')}${key.toUpperCase()}`;
}

/** Timer seconds, counted in the browser from what the server sent. */
function useElapsed(timer: Timer | null) {
    const [now, setNow] = useState(() => Date.now());
    // Moment this timer state arrived: pausing or resuming sends a new one.
    const [received, setReceived] = useState({ timer, at: Date.now() });

    if (received.timer !== timer) {
        setReceived({ timer, at: Date.now() });
    }

    const loadedAt = received.at;

    useEffect(() => {
        if (!timer || timer.paused) {
            return;
        }

        const id = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(id);
    }, [timer]);

    if (!timer) {
        return 0;
    }

    return timer.paused
        ? timer.elapsed
        : timer.elapsed + Math.max(0, Math.floor((now - loadedAt) / 1000));
}

/**
 * Menu bar window (380×680): the day's reading. It does not use the layout with
 * a sidebar: app.tsx skips the layout for this page.
 */
export default function QuickLog({
    readings,
    available,
    timer,
    week,
    streak,
    shortcut,
    saved,
}: QuickLogProps) {
    const { t } = useTranslation();
    const [bookId, setBookId] = useState<number | null>(
        timer?.book_id ?? readings[0]?.book_id ?? null,
    );
    // "Finish" pauses the timer and opens the final page; it only goes away on save or discard.
    const [finishing, setFinishing] = useState(false);
    // Local copy of the summary: rating reloads the page, and the flash does not come back.
    const [done, setDone] = useState<Saved | null>(saved);

    if (saved && saved.hash !== done?.hash) {
        setDone(saved);
    }

    const activeId = timer?.book_id ?? bookId;
    const selected =
        readings.find((item) => item.book_id === activeId) ??
        readings[0] ??
        null;

    let body;

    if (done) {
        body = done.finished ? (
            <FinishedPhase saved={done} onClose={() => setDone(null)} />
        ) : (
            <DonePhase saved={done} onClose={() => setDone(null)} />
        );
    } else if (selected === null) {
        body = <EmptyPhase available={available} />;
    } else if (timer && finishing) {
        body = (
            <FinishPhase
                timer={timer}
                book={selected}
                onCancel={() => setFinishing(false)}
            />
        );
    } else if (timer) {
        body = (
            <RunningPhase
                timer={timer}
                onStop={() => {
                    if (!timer.paused) {
                        router.post(pause.url(), {}, { preserveState: true });
                    }
                    setFinishing(true);
                }}
            />
        );
    } else {
        body = (
            <IdlePhase
                key={`${selected.book_id}-${selected.current_page}`}
                book={selected}
            />
        );
    }

    return (
        <div className="flex h-screen flex-col gap-4.5 overflow-hidden bg-bg p-5 text-text select-none">
            <Head title={t('Leitura do dia')} />

            <header className="flex items-baseline justify-between">
                <h1 className="text-lg font-extrabold tracking-tight">
                    {t('Leitura do dia')}
                </h1>
                <span className="font-mono text-[11px] text-muted">
                    {t(':shortcut abre isto', {
                        shortcut: formatShortcut(shortcut),
                    })}
                </span>
            </header>

            <WeekCard week={week} streak={streak} />

            {selected && !done && (
                <BookPicker
                    readings={readings}
                    available={available}
                    selected={selected}
                    locked={timer !== null}
                    onSelect={setBookId}
                />
            )}

            {body}

            <Toaster variant="bar" />
        </div>
    );
}

function WeekCard({ week, streak }: { week: number[]; streak: number }) {
    const { t, plural } = useTranslation();
    const readingDays = week.filter((level) => level > 0).length;

    return (
        <div
            className={cardClass(
                'flex items-center justify-between rounded-sm px-3.5 py-3',
            )}
        >
            <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-muted">
                    {t('Últimos 7 dias')}
                </span>
                <div
                    role="img"
                    aria-label={t(':count de 7 dias com leitura', {
                        count: readingDays,
                    })}
                    className="flex gap-1"
                >
                    {week.map((level, index) => (
                        <span
                            key={index}
                            className={cn(
                                heatClass(level),
                                'size-4 rounded-[4px]',
                                index === week.length - 1 &&
                                    (level > 0
                                        ? 'ring-2 ring-heat-3'
                                        : 'ring-1 ring-primary ring-inset'),
                            )}
                        />
                    ))}
                </div>
            </div>
            <span className="text-[13px] font-extrabold">
                {t(':days seguidos', {
                    days: plural(streak, 'dia', 'dias'),
                })}
            </span>
        </div>
    );
}

function BookPicker({
    readings,
    available,
    selected,
    locked,
    onSelect,
}: {
    readings: ReadingSummary[];
    available: { id: number; title: string }[];
    selected: ReadingSummary;
    locked: boolean;
    onSelect: (bookId: number) => void;
}) {
    const { t } = useTranslation();

    function choose(value: string) {
        if (!value.startsWith(START_PREFIX)) {
            onSelect(Number(value));

            return;
        }

        const id = Number(value.slice(START_PREFIX.length));
        router.post(startBook.url(), { book_id: id });
        onSelect(id);
    }

    return (
        <div className="flex items-center gap-3.5">
            <BookCover
                src={selected.cover_url}
                title={selected.title}
                className="w-13"
            />
            <Field label={t('Livro')} className="flex-1 text-[11px]">
                <Select
                    value={String(selected.book_id)}
                    disabled={locked}
                    onChange={(event) => choose(event.target.value)}
                    className="h-10 text-sm font-bold"
                >
                    {readings.map((item) => (
                        <option key={item.book_id} value={item.book_id}>
                            {item.title} ·{' '}
                            {t('p. :page', { page: item.current_page })}
                        </option>
                    ))}
                    {!locked && available.length > 0 && (
                        <optgroup label={t('Começar outro livro')}>
                            {available.map((book) => (
                                <option
                                    key={book.id}
                                    value={`${START_PREFIX}${book.id}`}
                                >
                                    {book.title}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </Select>
            </Field>
        </div>
    );
}

/** One square per minute read, up to a full grid. */
function MinuteGrid({ seconds, live }: { seconds: number; live: boolean }) {
    const { t } = useTranslation();
    const minutes = Math.floor(seconds / 60);

    return (
        <div
            role="img"
            aria-label={t(':minutes minutos lidos', { minutes })}
            className="grid grid-cols-10 gap-1"
        >
            {Array.from({ length: MINUTE_SQUARES }, (_, index) => {
                const lit = index < minutes;
                const current = live && index === minutes;

                return (
                    <span
                        key={index}
                        className={cn(
                            'aspect-square rounded-[4px] transition-colors duration-700',
                            current
                                ? 'animate-pulse bg-accent'
                                : heatClass(
                                      lit
                                          ? index % BRIGHT_EVERY ===
                                            BRIGHT_EVERY - 1
                                              ? 3
                                              : 2
                                          : 0,
                                  ),
                        )}
                    />
                );
            })}
        </div>
    );
}

function EmptyPhase({
    available,
}: {
    available: { id: number; title: string }[];
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-1 flex-col gap-3.5">
            <MinuteGrid seconds={0} live={false} />
            <p className="text-sm font-medium text-muted">
                {t('Nenhum livro em andamento.')}
            </p>
            {available.length > 0 && (
                <Select
                    defaultValue=""
                    aria-label={t('Começar a ler')}
                    onChange={(event) =>
                        event.target.value &&
                        router.post(startBook.url(), {
                            book_id: event.target.value,
                        })
                    }
                >
                    <option value="" disabled>
                        {t('Começar um livro de "quero ler"…')}
                    </option>
                    {available.map((book) => (
                        <option key={book.id} value={book.id}>
                            {book.title}
                        </option>
                    ))}
                </Select>
            )}
        </div>
    );
}

function IdlePhase({ book }: { book: ReadingSummary }) {
    const { t } = useTranslation();
    const form = useForm({
        book_id: book.book_id,
        start_page: String(book.current_page),
    });
    const page = Number(form.data.start_page) || 0;

    function begin(event: FormEvent) {
        event.preventDefault();
        form.post(start.url());
    }

    function step(delta: number) {
        const next = Math.max(book.current_page, page + delta);
        form.setData('start_page', String(next));
    }

    return (
        <form onSubmit={begin} className="flex flex-1 flex-col gap-3.5">
            <MinuteGrid seconds={0} live={false} />
            <p className="text-xs font-medium text-muted">
                {t('cada quadrado acende a cada minuto lido')}
            </p>

            <div className="mt-auto flex flex-col gap-2">
                <label className="flex flex-col gap-2 text-xs font-bold text-muted">
                    {t('começo na página')}
                    <span className="flex items-center gap-2.5">
                        <IconButton
                            label={t('Página anterior')}
                            onClick={() => step(-1)}
                            disabled={page <= book.current_page}
                            className="size-12 text-xl"
                        >
                            −
                        </IconButton>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={book.current_page}
                            value={form.data.start_page}
                            onChange={(event) =>
                                form.setData('start_page', event.target.value)
                            }
                            className={cn(pageInputClass, 'text-5xl text-text')}
                        />
                        <IconButton
                            label={t('Próxima página')}
                            onClick={() => step(1)}
                            className="size-12 text-xl"
                        >
                            +
                        </IconButton>
                    </span>
                </label>
                {form.errors.start_page && (
                    <p className="text-xs font-semibold text-danger">
                        {form.errors.start_page}
                    </p>
                )}
                <Button
                    type="submit"
                    autoFocus
                    disabled={form.processing}
                    className="h-12"
                >
                    <PlayIcon />
                    {t('Começar a ler')}
                    <span className="font-mono text-[11px] font-medium opacity-60">
                        ↵
                    </span>
                </Button>
            </div>
        </form>
    );
}

function RunningPhase({ timer, onStop }: { timer: Timer; onStop: () => void }) {
    const { t } = useTranslation();
    const seconds = useElapsed(timer);
    const stateColor = timer.paused ? 'text-warn' : 'text-accent';

    return (
        <section
            aria-label={t('Sessão em andamento')}
            className="flex flex-1 flex-col gap-3.5"
        >
            <div className="flex items-baseline justify-between">
                <span
                    className={cn(
                        'flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase',
                        stateColor,
                    )}
                >
                    <span
                        className={cn(
                            'size-1.75 rounded-full bg-current',
                            !timer.paused && 'animate-pulse',
                        )}
                    />
                    {timer.paused ? t('pausado') : t('lendo')}
                </span>
                <span className="font-mono text-xs text-muted">
                    {t('desde a p. :page', { page: timer.start_page })}
                </span>
            </div>
            <div
                role="timer"
                className="text-7xl leading-[0.9] font-extrabold tracking-[-0.05em] tabular-nums"
            >
                {Math.floor(seconds / 60)}
                <span className="text-[22px] font-bold tracking-normal text-faint">
                    {' '}
                    {t('min')}
                </span>
            </div>
            <MinuteGrid seconds={seconds} live={!timer.paused} />
            <span className="text-xs font-medium text-muted">
                {t('cada quadrado acende a cada minuto lido')}
            </span>

            <div className="mt-auto flex flex-col items-center gap-1">
                <div className="flex w-full gap-2">
                    <Button
                        variant="ghost"
                        onClick={() =>
                            router.post(
                                timer.paused ? resume.url() : pause.url(),
                            )
                        }
                        className="h-12 flex-1"
                    >
                        {timer.paused ? t('▶ Continuar') : t('❚❚ Pausar')}
                    </Button>
                    <Button autoFocus onClick={onStop} className="h-12 flex-1">
                        {t('Terminar')}
                    </Button>
                </div>
                <DiscardButton />
            </div>
        </section>
    );
}

/** Two taps to discard: confirm() disappears with the menu bar window. */
function DiscardButton() {
    const { t } = useTranslation();
    const [confirming, setConfirming] = useState(false);

    return (
        <button
            type="button"
            onClick={() =>
                confirming ? router.delete(discard.url()) : setConfirming(true)
            }
            onBlur={() => setConfirming(false)}
            className={cn(
                'h-9 text-[13px] font-bold',
                confirming ? 'text-danger' : 'text-muted hover:text-text',
            )}
        >
            {confirming ? t('confirmar: descartar sem salvar') : t('descartar')}
        </button>
    );
}

function FinishPhase({
    timer,
    book,
    onCancel,
}: {
    timer: Timer;
    book: ReadingSummary;
    onCancel: () => void;
}) {
    const { t } = useTranslation();
    const seconds = useElapsed(timer);
    const minutes = Math.max(1, Math.round(seconds / 60));
    const form = useForm({ page_to: String(timer.start_page + 1) });
    const pageTo = Number(form.data.page_to) || 0;
    const gained = Math.max(0, pageTo - timer.start_page);
    const lastPage = book.pages ?? Infinity;

    function save(event: FormEvent) {
        event.preventDefault();
        form.post(finish.url(), {
            onSuccess: onCancel,
        });
    }

    function moveTo(page: number) {
        const bounded = Math.min(
            lastPage,
            Math.max(timer.start_page + 1, page),
        );
        form.setData('page_to', String(bounded));
    }

    return (
        <form onSubmit={save} className="flex flex-1 flex-col gap-3.5">
            <SectionTitle>
                {t('sessão de :minutes min', { minutes })}
            </SectionTitle>
            <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-muted">
                    {t('parei na página')}
                </span>
                <div className="flex items-center gap-2.5">
                    <IconButton
                        label={t('Página anterior')}
                        onClick={() => moveTo(pageTo - 1)}
                        disabled={pageTo <= timer.start_page + 1}
                        className="size-12 text-xl"
                    >
                        −
                    </IconButton>
                    <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
                        <input
                            type="number"
                            inputMode="numeric"
                            autoFocus
                            min={timer.start_page + 1}
                            max={book.pages ?? undefined}
                            value={form.data.page_to}
                            onChange={(event) =>
                                form.setData('page_to', event.target.value)
                            }
                            onFocus={(event) => event.target.select()}
                            aria-label={t('parei na página')}
                            className={cn(pageInputClass, 'text-[56px]')}
                        />
                        {book.pages !== null && (
                            <span className="shrink-0 text-base font-bold text-faint">
                                {t('de :pages', { pages: book.pages })}
                            </span>
                        )}
                    </label>
                    <IconButton
                        label={t('Próxima página')}
                        onClick={() => moveTo(pageTo + 1)}
                        disabled={pageTo >= lastPage}
                        className="size-12 text-xl"
                    >
                        +
                    </IconButton>
                </div>
                <div className="flex justify-center gap-1.5">
                    {PAGE_JUMPS.map((pages) => (
                        <Button
                            key={pages}
                            variant="ghost"
                            onClick={() => moveTo(pageTo + pages)}
                            className="h-8 px-3 font-mono text-xs"
                        >
                            +{pages}
                        </Button>
                    ))}
                </div>
            </div>
            <div
                className={cardClass(
                    'flex justify-between rounded-sm px-3.5 py-3 font-mono text-xs text-secondary',
                )}
            >
                <span>{t(':pages págs', { pages: gained })}</span>
                <span>{t(':minutes min', { minutes })}</span>
                <span>
                    {t(':pages págs/h', {
                        pages: Math.round(gained / (minutes / 60)),
                    })}
                </span>
            </div>
            {form.errors.page_to && (
                <p className="text-center text-xs font-semibold text-danger">
                    {form.errors.page_to}
                </p>
            )}

            <Button
                type="submit"
                disabled={form.processing || gained === 0}
                className="mt-auto h-12"
            >
                {form.processing ? t('Salvando…') : t('Salvar sessão')}
                <span className="font-mono text-[11px] font-medium opacity-60">
                    ↵
                </span>
            </Button>
            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={() => {
                        router.post(resume.url(), {}, { preserveState: true });
                        onCancel();
                    }}
                    className="h-9 text-[13px] font-bold text-link hover:underline"
                >
                    {t('voltar a ler')}
                </button>
                <DiscardButton />
            </div>
        </form>
    );
}

function DonePhase({ saved, onClose }: { saved: Saved; onClose: () => void }) {
    const { t } = useTranslation();

    return (
        <section
            aria-label={t('Sessão salva')}
            className="flex flex-1 flex-col items-start gap-2.5"
        >
            <span className="text-xs font-extrabold tracking-widest text-link uppercase">
                {t('Terminou!')}
            </span>
            <span className="text-[44px] leading-none font-extrabold tracking-tighter">
                {t(':pages págs hoje', { pages: saved.pages })}
            </span>
            <span className="font-mono text-[13px] text-secondary">
                {saved.minutes !== null &&
                    `${t('em :minutes min', { minutes: saved.minutes })} · `}
                {t('agora na p. :page', { page: saved.page_to })}
            </span>
            <span className="font-mono text-[11px] text-accent">
                {saved.hash} · {saved.title}
            </span>
            <span className="text-[13px] font-semibold text-muted">
                {t('a data é hoje; ajuste no app se precisar')}
            </span>
            <Button
                variant="ghost"
                autoFocus
                onClick={onClose}
                className="mt-auto h-12 self-stretch"
            >
                {t('Fechar')}
            </Button>
        </section>
    );
}

/** Session that reached the last page: the book ends here, with a rating and the next in the queue. */
function FinishedPhase({
    saved,
    onClose,
}: {
    saved: Saved;
    onClose: () => void;
}) {
    const { t, plural } = useTranslation();
    const [rating, setRating] = useState<number | null>(null);

    return (
        <section
            aria-label={t('Sessão salva')}
            className="flex flex-1 flex-col items-start gap-3"
        >
            <span className="text-xs font-extrabold tracking-widest text-link uppercase">
                {t('Terminou!')}
            </span>
            <span className="text-[28px] leading-tight font-extrabold tracking-tight">
                {saved.title}
            </span>
            <span className="font-mono text-[13px] text-secondary">
                {saved.days !== null &&
                    `${plural(saved.days, 'dia', 'dias')} · `}
                +{t(':pages págs hoje', { pages: saved.pages })}
            </span>
            <StarRating
                value={rating}
                size={28}
                onChange={(value) => {
                    setRating(value);
                    router.patch(
                        readingRoute.url(saved.book_id),
                        { rating: value },
                        { preserveState: true, preserveScroll: true },
                    );
                }}
            />
            <span className="text-[13px] font-semibold text-muted">
                {t('a data é hoje; ajuste no app se precisar')}
            </span>
            <div className="mt-auto flex w-full flex-col gap-2">
                {saved.next && (
                    <Button
                        autoFocus
                        onClick={() => {
                            router.post(startBook.url(), {
                                book_id: saved.next!.id,
                            });
                            onClose();
                        }}
                        className="h-12"
                    >
                        {t('Começar :title, o próximo', {
                            title: saved.next.title,
                        })}
                    </Button>
                )}
                <Button
                    variant="ghost"
                    autoFocus={!saved.next}
                    onClick={onClose}
                    className="h-12"
                >
                    {t('Fechar')}
                </Button>
            </div>
        </section>
    );
}

function PlayIcon() {
    return (
        <svg
            aria-hidden="true"
            width="12"
            height="14"
            viewBox="0 0 12 14"
            fill="currentColor"
        >
            <path d="M1 1.2v11.6a.6.6 0 0 0 .9.5l9.4-5.8a.6.6 0 0 0 0-1L1.9.7A.6.6 0 0 0 1 1.2z" />
        </svg>
    );
}
