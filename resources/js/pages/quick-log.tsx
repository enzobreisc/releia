import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { heatClass } from '@/components/heat-map';
import { LogoMark } from '@/components/icons';
import { StarRating } from '@/components/star-rating';
import { Toaster } from '@/components/toaster';
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
    /** A sessão chegou à última página: o livro foi marcado como lido. */
    finished: boolean;
    days: number | null;
    /** Próximo da fila, para começar daqui. */
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

/** Cada quadrado da grade acende a cada minuto lido; 25 = uma grade cheia. */
const GRID = 25;

/** "CmdOrCtrl+Shift+L" vira "⇧⌘L", como o macOS mostra nos menus. */
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

function clock(seconds: number) {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}

/** Segundos do timer, contando no navegador a partir do que o servidor mandou. */
function useElapsed(timer: Timer | null) {
    const [now, setNow] = useState(() => Date.now());
    // Momento em que este estado do timer chegou: pausar ou continuar manda um novo.
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
 * Janela da barra de menu (360×560): a leitura do dia. Não usa o layout com
 * barra lateral: o app.tsx pula o layout para esta página.
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
    const [bookId, setBookId] = useState<number | null>(
        timer?.book_id ?? readings[0]?.book_id ?? null,
    );
    // "Terminar" pausa o timer e abre a página final; só some ao salvar ou descartar.
    const [finishing, setFinishing] = useState(false);
    // Cópia local do resumo: dar a nota recarrega a página, e o flash não volta.
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
            <DonePhase saved={done} week={week} onClose={() => setDone(null)} />
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
        <div className="flex h-screen flex-col overflow-hidden bg-bg text-text select-none">
            <Head title="Leitura do dia" />

            <header className="flex items-center justify-between gap-2.5 border-b border-elevated px-4 pt-3.5 pb-3">
                <div className="flex items-center gap-2">
                    <LogoMark size={16} />
                    <span className="font-mono text-xs font-bold">
                        leitura de hoje
                    </span>
                </div>
                <div className="flex items-center gap-2" title="Últimos 7 dias">
                    <WeekStrip week={week} size="sm" />
                    <span className="font-mono text-[11px] text-muted">
                        {streak}d
                    </span>
                </div>
            </header>

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

            <footer className="flex justify-between border-t border-elevated px-4 py-2 font-mono text-[10px] text-faint">
                <span>{formatShortcut(shortcut)} abre isto</span>
                <span>releia</span>
            </footer>
        </div>
    );
}

function WeekStrip({ week, size }: { week: number[]; size: 'sm' | 'lg' }) {
    return (
        <div
            aria-hidden="true"
            className={cn('flex', size === 'sm' ? 'gap-[3px]' : 'gap-1.5')}
        >
            {week.map((level, index) => (
                <span
                    key={index}
                    className={cn(
                        heatClass(level),
                        size === 'sm'
                            ? 'size-[9px] rounded-[2px]'
                            : 'size-6.5 rounded-[5px]',
                        index === week.length - 1 &&
                            (level > 0
                                ? 'ring-2 ring-heat-3'
                                : 'ring-1 ring-primary ring-inset'),
                    )}
                />
            ))}
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
    const [adding, setAdding] = useState(false);

    return (
        <div className="flex flex-col gap-2.5 px-4 pt-3.5">
            <div
                role="radiogroup"
                aria-label="Livro"
                className="flex items-end gap-2"
            >
                {readings.map((item) => {
                    const isSelected = item.book_id === selected.book_id;

                    return (
                        <button
                            key={item.book_id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={item.title}
                            title={item.title}
                            disabled={locked && !isSelected}
                            onClick={() => onSelect(item.book_id)}
                            className={cn(
                                'shrink-0 rounded-[4px] transition-all',
                                isSelected
                                    ? 'w-12 ring-2 ring-primary/40'
                                    : 'w-8.5 opacity-70 hover:opacity-100 disabled:opacity-30',
                            )}
                        >
                            <BookCover
                                src={item.cover_url}
                                title={item.title}
                                className={cn(
                                    'w-full',
                                    isSelected && 'border-primary',
                                )}
                            />
                        </button>
                    );
                })}
                {!locked && available.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setAdding(!adding)}
                        aria-expanded={adding}
                        aria-label="Começar outro livro"
                        title="Começar outro livro"
                        className="flex h-12.5 w-8.5 shrink-0 items-center justify-center rounded-[4px] border border-dashed text-muted hover:border-primary hover:text-accent"
                    >
                        +
                    </button>
                )}
            </div>

            {adding ? (
                <label className="flex flex-col gap-1 text-xs text-muted">
                    Começar a ler
                    <select
                        defaultValue=""
                        onChange={(event) => {
                            if (event.target.value) {
                                router.post(startBook.url(), {
                                    book_id: event.target.value,
                                });
                                onSelect(Number(event.target.value));
                                setAdding(false);
                            }
                        }}
                        className="h-9 rounded-sm border bg-surface px-2 text-sm text-text"
                    >
                        <option value="" disabled>
                            Um livro de "quero ler"…
                        </option>
                        {available.map((book) => (
                            <option key={book.id} value={book.id}>
                                {book.title}
                            </option>
                        ))}
                    </select>
                </label>
            ) : (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-bold">
                            {selected.title}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-muted">
                            p. {selected.current_page}
                            {selected.pages !== null && `/${selected.pages}`}
                        </span>
                    </div>
                    <div className="h-1 rounded-full bg-elevated">
                        <div
                            className="h-1 rounded-full bg-primary"
                            style={{ width: `${selected.percent ?? 0}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/** Grade 5×5 que acende um quadrado por minuto, em tons cada vez mais claros. */
function MinuteGrid({ seconds, live }: { seconds: number; live: boolean }) {
    const lit = Math.min(GRID, Math.floor(seconds / 60));

    return (
        <div
            aria-hidden="true"
            className="grid grid-cols-[repeat(5,22px)] grid-rows-[repeat(5,22px)] gap-1.25"
        >
            {Array.from({ length: GRID }, (_, index) => {
                const on = index < lit;
                const current = live && index === lit;
                const level = on ? 1 + Math.min(3, Math.floor(index / 7)) : 0;

                return (
                    <span
                        key={index}
                        className={cn(
                            'rounded-[4px] transition-colors duration-700',
                            current
                                ? 'animate-pulse bg-primary'
                                : heatClass(level),
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
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <MinuteGrid seconds={0} live={false} />
            <p className="text-sm text-muted">Nenhum livro em andamento.</p>
            {available.length > 0 && (
                <select
                    defaultValue=""
                    aria-label="Começar a ler"
                    onChange={(event) =>
                        event.target.value &&
                        router.post(startBook.url(), {
                            book_id: event.target.value,
                        })
                    }
                    className="h-10 w-full rounded-sm border bg-surface px-2.5 text-sm"
                >
                    <option value="" disabled>
                        Começar um livro de "quero ler"…
                    </option>
                    {available.map((book) => (
                        <option key={book.id} value={book.id}>
                            {book.title}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}

function IdlePhase({ book }: { book: ReadingSummary }) {
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
        <form
            onSubmit={begin}
            className="flex flex-1 flex-col justify-between gap-4 px-4 pt-4.5 pb-4"
        >
            <div className="flex flex-col items-center gap-3.5">
                <MinuteGrid seconds={0} live={false} />
                <p className="text-center text-xs text-muted">
                    cada quadrado acende a cada minuto lido
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <label className="flex h-12.5 items-center justify-between gap-2.5 rounded-md border bg-surface pr-1.5 pl-3.5">
                    <span className="text-[13px] text-muted">
                        começo na página
                    </span>
                    <span className="flex items-center gap-1">
                        <button
                            type="button"
                            aria-label="Página anterior"
                            onClick={() => step(-1)}
                            disabled={page <= book.current_page}
                            className="size-7.5 rounded-sm bg-elevated text-nav hover:text-text disabled:opacity-40"
                        >
                            −
                        </button>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={book.current_page}
                            value={form.data.start_page}
                            onChange={(event) =>
                                form.setData('start_page', event.target.value)
                            }
                            className="h-9 w-13 [appearance:textfield] bg-transparent text-center font-mono text-xl font-bold outline-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            aria-label="Próxima página"
                            onClick={() => step(1)}
                            className="size-7.5 rounded-sm bg-elevated text-nav hover:text-text"
                        >
                            +
                        </button>
                    </span>
                </label>
                {form.errors.start_page && (
                    <p className="text-xs text-red-300">
                        {form.errors.start_page}
                    </p>
                )}
                <button
                    type="submit"
                    autoFocus
                    disabled={form.processing}
                    className="flex h-12 items-center justify-center gap-2.5 rounded-md bg-primary text-[15px] font-bold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                    <PlayIcon />
                    Começar a ler
                    <span className="font-mono text-[11px] font-medium opacity-80">
                        ↵
                    </span>
                </button>
            </div>
        </form>
    );
}

function RunningPhase({ timer, onStop }: { timer: Timer; onStop: () => void }) {
    const seconds = useElapsed(timer);
    // Dois toques para descartar: confirm() some com a janela da barra de menu.
    const [confirming, setConfirming] = useState(false);

    return (
        <div className="flex flex-1 flex-col justify-between gap-3.5 px-4 pt-4.5 pb-4">
            <div className="flex flex-col items-center gap-3">
                <MinuteGrid seconds={seconds} live={!timer.paused} />
                <div
                    role="timer"
                    className="font-mono text-[44px] leading-none font-bold tracking-tight tabular-nums"
                >
                    {clock(seconds)}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                    <span
                        className={cn(
                            'size-1.5 rounded-full',
                            timer.paused
                                ? 'bg-faint'
                                : 'animate-pulse bg-heat-3',
                        )}
                    />
                    {timer.paused ? 'pausado' : 'lendo'} · desde a p.{' '}
                    {timer.start_page}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            router.post(
                                timer.paused ? resume.url() : pause.url(),
                            )
                        }
                        className="h-12 flex-1 rounded-md border bg-surface text-sm font-semibold hover:bg-active"
                    >
                        {timer.paused ? '▶ Continuar' : '❚❚ Pausar'}
                    </button>
                    <button
                        type="button"
                        autoFocus
                        onClick={onStop}
                        className="flex h-12 flex-[1.4] items-center justify-center gap-2 rounded-md bg-primary text-sm font-bold text-white hover:bg-primary/90"
                    >
                        <span className="size-2.5 rounded-[2px] bg-white" />
                        Terminar
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        confirming
                            ? router.delete(discard.url())
                            : setConfirming(true)
                    }
                    onBlur={() => setConfirming(false)}
                    className={cn(
                        'h-7 text-xs',
                        confirming
                            ? 'font-semibold text-red-300'
                            : 'text-faint hover:text-muted',
                    )}
                >
                    {confirming
                        ? 'confirmar: descartar sem salvar'
                        : 'descartar'}
                </button>
            </div>
        </div>
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
    const seconds = useElapsed(timer);
    const minutes = Math.max(1, Math.round(seconds / 60));
    const form = useForm({ page_to: String(timer.start_page + 1) });
    const pageTo = Number(form.data.page_to) || 0;
    const gained = Math.max(0, pageTo - timer.start_page);

    function save(event: FormEvent) {
        event.preventDefault();
        form.post(finish.url(), {
            onSuccess: onCancel,
        });
    }

    function bump(pages: number) {
        const next = timer.start_page + pages;
        form.setData(
            'page_to',
            String(book.pages ? Math.min(book.pages, next) : next),
        );
    }

    return (
        <form
            onSubmit={save}
            className="flex flex-1 flex-col justify-between gap-3 px-4 pt-4 pb-4"
        >
            <div className="flex flex-col gap-2.5">
                <span className="font-mono text-[11px] text-muted">
                    ## sessão de {minutes} min
                </span>
                <label className="flex flex-col items-center gap-1 rounded-[10px] border border-primary bg-surface p-3.5">
                    <span className="text-[13px] text-muted">
                        parei na página
                    </span>
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
                        className="w-32 [appearance:textfield] bg-transparent text-center font-mono text-5xl leading-none font-bold outline-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {book.pages !== null && (
                        <span className="font-mono text-[11px] text-faint">
                            de {book.pages}
                        </span>
                    )}
                </label>
                <div className="flex justify-center gap-1.5">
                    {[5, 10, 20].map((pages) => (
                        <button
                            key={pages}
                            type="button"
                            onClick={() => bump(pages)}
                            className="h-8 rounded-full border px-3 font-mono text-xs text-accent hover:bg-active"
                        >
                            +{pages}
                        </button>
                    ))}
                </div>
                <div className="flex justify-between rounded-md bg-surface px-3 py-2.5 font-mono text-xs">
                    <span className="text-heat-3">+{gained} págs</span>
                    <span className="text-muted">{minutes} min</span>
                    <span className="text-muted">
                        ~{Math.round(gained / (minutes / 60))} págs/h
                    </span>
                </div>
                {form.errors.page_to && (
                    <p className="text-center text-xs text-red-300">
                        {form.errors.page_to}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-1.5">
                <button
                    type="submit"
                    disabled={form.processing || gained === 0}
                    className="h-12 rounded-md bg-primary text-[15px] font-bold text-white hover:bg-primary/90 disabled:opacity-60"
                >
                    {form.processing ? 'Salvando…' : 'Salvar sessão'}{' '}
                    <span className="font-mono text-[11px] font-medium opacity-80">
                        ↵
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        router.post(resume.url(), {}, { preserveState: true });
                        onCancel();
                    }}
                    className="h-8 text-xs text-muted hover:text-text"
                >
                    voltar a ler
                </button>
            </div>
        </form>
    );
}

function DonePhase({
    saved,
    week,
    onClose,
}: {
    saved: Saved;
    week: number[];
    onClose: () => void;
}) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-4 pt-4.5 pb-4 text-center">
            <WeekStrip week={week} size="lg" />
            <div className="font-mono text-[22px] font-bold">
                {saved.streak} {saved.streak === 1 ? 'dia' : 'dias'} seguidos
            </div>
            <div className="text-[13px] text-muted">
                +{saved.pages} págs
                {saved.minutes !== null && ` em ${saved.minutes} min`} · agora
                na p. {saved.page_to}
            </div>
            <div className="font-mono text-[11px] text-accent">
                {saved.hash} · {saved.title}
            </div>
            <button
                type="button"
                autoFocus
                onClick={onClose}
                className="mt-2 h-10 rounded-md border bg-surface px-4.5 text-[13px] hover:bg-active"
            >
                Fechar
            </button>
        </div>
    );
}

/** Sessão que chegou à última página: o livro termina aqui, com a nota e o próximo da fila. */
function FinishedPhase({
    saved,
    onClose,
}: {
    saved: Saved;
    onClose: () => void;
}) {
    const [rating, setRating] = useState<number | null>(null);

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pt-4.5 pb-4 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent text-lg font-bold text-bg">
                ✓
            </span>
            <div className="font-mono text-[17px] font-bold">Terminou!</div>
            <div className="text-xs text-muted">
                {saved.title}
                {saved.days !== null &&
                    ` · ${saved.days} ${saved.days === 1 ? 'dia' : 'dias'}`}{' '}
                · +{saved.pages} págs hoje
            </div>
            <StarRating
                value={rating}
                size={24}
                onChange={(value) => {
                    setRating(value);
                    router.patch(
                        readingRoute.url(saved.book_id),
                        { rating: value },
                        { preserveState: true, preserveScroll: true },
                    );
                }}
            />
            <span className="text-[11px] text-faint">
                a data é hoje; ajuste no app se precisar
            </span>
            {saved.next && (
                <button
                    type="button"
                    autoFocus
                    onClick={() => {
                        router.post(startBook.url(), {
                            book_id: saved.next!.id,
                        });
                        onClose();
                    }}
                    className="mt-1 h-11 w-full rounded-md bg-primary text-[13px] font-semibold text-white hover:bg-primary/90"
                >
                    Começar {saved.next.title}, o próximo
                </button>
            )}
            <button
                type="button"
                autoFocus={!saved.next}
                onClick={onClose}
                className="h-9 rounded-md px-4 text-xs text-muted hover:text-text"
            >
                Fechar
            </button>
        </div>
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
