import { Head } from '@inertiajs/react';
import { BookCover } from '@/components/book-cover';
import { LiveSessionBackdrop } from '@/components/live-session/live-session-backdrop';
import { LiveSessionHeader } from '@/components/live-session/live-session-header';
import { SessionPanel } from '@/components/live-session/session-panel';
import { SessionStats } from '@/components/session-stats';
import { useElapsed } from '@/hooks/use-elapsed';
import { useLeaveOnEscape } from '@/hooks/use-leave-on-escape';
import { useLiveSessionActions } from '@/hooks/use-live-session-actions';
import { useNow } from '@/hooks/use-now';
import { useSessionProgress } from '@/hooks/use-session-progress';
import { useTranslation } from '@/hooks/use-translation';
import { show as showBook } from '@/routes/books';
import type { LiveSessionDay, LiveSessionTimer, ReadingSummary } from '@/types';

type LiveSessionProps = {
    reading: ReadingSummary;
    timer: LiveSessionTimer;
    pages_per_hour: number | null;
    today: LiveSessionDay;
    week: number[];
    streak: number;
};

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
    const { t } = useTranslation();
    const seconds = useElapsed(timer);
    const now = useNow();
    const progress = useSessionProgress({ reading, timer, pagesPerHour, now });
    const actions = useLiveSessionActions(progress.isOnLastPage);
    const bookUrl = showBook.url(reading.book_id);

    useLeaveOnEscape(bookUrl);

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-bg">
            <Head title={t('Sessão de leitura')} />

            <LiveSessionBackdrop coverUrl={reading.cover_url} />

            <LiveSessionHeader
                bookUrl={bookUrl}
                startedAt={timer.started_at}
                now={now}
            />

            <main className="relative flex min-h-0 flex-1 flex-wrap items-center justify-center gap-x-24 gap-y-8 overflow-y-auto px-14 lg:px-30">
                <BookCover
                    src={reading.cover_url}
                    title={reading.title}
                    className="w-[clamp(10rem,22vw,20rem)] rounded-[10px] shadow-hero"
                />

                <SessionPanel
                    reading={reading}
                    timer={timer}
                    seconds={seconds}
                    progress={progress}
                    actions={actions}
                />
            </main>

            <footer className="relative px-14 pt-6 pb-12">
                <SessionStats
                    pagesToday={today.pages + Math.max(0, progress.gained)}
                    averagePages={today.average}
                    dailyGoal={today.goal}
                    streak={streak}
                    week={week}
                    pagesLeft={progress.pagesLeft}
                    minutesLeft={progress.minutesLeft}
                    daysLeft={reading.days_left}
                    finishTime={progress.finishTime}
                />
            </footer>
        </div>
    );
}
