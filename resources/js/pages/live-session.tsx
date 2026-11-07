import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { BookCover } from '@/components/book-cover';
import { DiscardSessionButton } from '@/components/discard-session-button';
import { Button, IconButton } from '@/components/form';
import { ArrowLeftIcon, PauseIcon, PlayIcon } from '@/components/icons';
import { SessionProgressBar } from '@/components/session-progress-bar';
import { SessionStats } from '@/components/session-stats';
import { useElapsed } from '@/hooks/use-elapsed';
import { useNow } from '@/hooks/use-now';
import { useTranslation } from '@/hooks/use-translation';
import { formatStopwatch, minutesToRead } from '@/lib/session';
import { cn } from '@/lib/utils';
import { show as showBook } from '@/routes/books';
import { finish, page as movePage, pause, resume } from '@/routes/live-session';
import type { LiveSessionDay, LiveSessionTimer, ReadingSummary } from '@/types';

type LiveSessionProps = {
    reading: ReadingSummary;
    timer: LiveSessionTimer;
    pages_per_hour: number | null;
    today: LiveSessionDay;
    week: number[];
    streak: number;
};

const MS_PER_MINUTE = 60_000;

/**
 * Full-screen reading session, open while the reader reads. The timer lives in the
 * server (the menu bar window shows the same one); leaving this screen does not stop it.
 */
export default function LiveSession({
    reading,
    timer,
    pages_per_hour: pagesPerHour,
    today,
    week,
    streak,
}: LiveSessionProps) {
    const { t, clockTime } = useTranslation();
    const seconds = useElapsed(timer);
    const now = useNow();
    const [isFinishing, setFinishing] = useState(false);

    const gained = timer.page - timer.start_page;
    const pagesLeft =
        reading.pages === null ? null : reading.pages - timer.page;
    const minutesLeft =
        pagesLeft !== null && pagesLeft > 0 && pagesPerHour !== null
            ? minutesToRead(pagesLeft, pagesPerHour)
            : null;
    const finishTime =
        minutesLeft === null
            ? null
            : clockTime(new Date(now.getTime() + minutesLeft * MS_PER_MINUTE));

    useEffect(() => {
        function leaveOnEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                router.visit(showBook.url(reading.book_id));
            }
        }

        window.addEventListener('keydown', leaveOnEscape);

        return () => window.removeEventListener('keydown', leaveOnEscape);
    }, [reading.book_id]);

    function moveTo(page: number) {
        router.patch(movePage.url(), { page }, { preserveScroll: true });
    }

    function finishSession() {
        router.post(
            finish.url(),
            {},
            {
                onStart: () => setFinishing(true),
                onFinish: () => setFinishing(false),
            },
        );
    }

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-bg">
            <Head title={t('Sessão de leitura')} />

            {reading.cover_url && (
                <img
                    src={reading.cover_url}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-32 left-16 h-175 w-190 rounded-full object-cover opacity-30 blur-[130px]"
                />
            )}

            <header className="relative flex items-center justify-between px-14 pt-9 app-drag">
                <Link
                    href={showBook.url(reading.book_id)}
                    className="flex h-11 items-center gap-2.5 text-[13px] font-semibold text-secondary app-no-drag hover:text-text"
                >
                    <ArrowLeftIcon />
                    {t('Sair da sessão')}
                    <kbd className="font-mono text-[11px] font-normal text-muted">
                        esc
                    </kbd>
                </Link>
                <div className="flex items-baseline gap-4 font-mono">
                    <span className="text-xs text-muted">
                        {t('iniciada às :time', {
                            time: clockTime(new Date(timer.started_at)),
                        })}
                    </span>
                    <span className="text-lg font-medium">
                        {clockTime(now)}
                    </span>
                </div>
            </header>

            <main className="relative flex min-h-0 flex-1 flex-wrap items-center justify-center gap-x-24 gap-y-8 overflow-y-auto px-14 lg:px-30">
                <BookCover
                    src={reading.cover_url}
                    title={reading.title}
                    className="w-[clamp(10rem,22vw,20rem)] rounded-[10px] shadow-hero"
                />

                <section
                    aria-label={t('Sessão em andamento')}
                    className="flex w-full max-w-150 min-w-0 flex-1 basis-96 flex-col gap-7"
                >
                    <div className="flex flex-col gap-2.5">
                        <span
                            className={cn(
                                'flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase',
                                timer.paused ? 'text-warn' : 'text-accent',
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
                        <h1 className="text-[clamp(2.5rem,4.5vw,4rem)] leading-[0.95] font-extrabold tracking-[-0.045em]">
                            {reading.title}
                        </h1>
                        <p className="text-xl font-semibold text-secondary">
                            {reading.authors}
                        </p>
                    </div>

                    <div
                        role="timer"
                        className="text-[clamp(5rem,9.7vw,8.25rem)] leading-[0.85] font-extrabold tracking-[-0.05em] tabular-nums"
                    >
                        {formatStopwatch(seconds)}
                    </div>

                    {reading.pages !== null && (
                        <SessionProgressBar
                            startPage={timer.start_page}
                            page={timer.page}
                            pages={reading.pages}
                        />
                    )}

                    <div className="flex flex-wrap items-center gap-3.5">
                        <button
                            type="button"
                            aria-label={
                                timer.paused ? t('Continuar') : t('Pausar')
                            }
                            onClick={() =>
                                router.post(
                                    (timer.paused ? resume : pause).url(),
                                )
                            }
                            className="inline-flex size-18 items-center justify-center rounded-full bg-text text-bg hover:bg-white"
                        >
                            {timer.paused ? <PlayIcon /> : <PauseIcon />}
                        </button>
                        <div className="flex h-13 items-center rounded-full bg-elevated inset-ring inset-ring-strong">
                            <IconButton
                                label={t('Voltar uma página')}
                                variant="plain"
                                disabled={timer.page <= timer.start_page}
                                onClick={() => moveTo(timer.page - 1)}
                                className="size-13 text-[22px]"
                            >
                                −
                            </IconButton>
                            <span className="min-w-16 text-center font-mono text-sm font-medium">
                                {t('p. :page', { page: timer.page })}
                            </span>
                            <IconButton
                                label={t('Avançar uma página')}
                                variant="plain"
                                disabled={
                                    reading.pages !== null &&
                                    timer.page >= reading.pages
                                }
                                onClick={() => moveTo(timer.page + 1)}
                                className="size-13 text-[22px]"
                            >
                                +
                            </IconButton>
                        </div>
                        <span className="flex-1" />
                        <Button
                            variant="ghost"
                            disabled={gained <= 0 || isFinishing}
                            onClick={finishSession}
                            className="h-13 px-6 font-extrabold"
                        >
                            {t('Terminar sessão')}
                        </Button>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[13px] font-semibold text-muted">
                            {gained <= 0 &&
                                t('Avance ao menos uma página para terminar')}
                        </span>
                        <DiscardSessionButton />
                    </div>
                </section>
            </main>

            <footer className="relative px-14 pt-6 pb-12">
                <SessionStats
                    pagesToday={today.pages + Math.max(0, gained)}
                    averagePages={today.average}
                    dailyGoal={today.goal}
                    streak={streak}
                    week={week}
                    pagesLeft={pagesLeft}
                    minutesLeft={minutesLeft}
                    daysLeft={reading.days_left}
                    finishTime={finishTime}
                />
            </footer>
        </div>
    );
}
