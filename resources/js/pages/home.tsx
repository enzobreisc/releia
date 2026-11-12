import { GoalCard } from '@/components/home/goal-card';
import { NothingInProgress } from '@/components/home/nothing-in-progress';
import { ReadingHero } from '@/components/home/reading-hero';
import { RecentlyFinished } from '@/components/home/recently-finished';
import { TodayCard } from '@/components/home/today-card';
import { TodaySuggestion } from '@/components/home/today-suggestion';
import { LiveSessionPill } from '@/components/live-session-pill';
import { NextInQueueCard } from '@/components/next-in-queue-card';
import { PageHeader } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import type {
    HomeLiveSession,
    HomeToday,
    NextInQueue,
    ReadingSummary,
    RecentBook,
    Suggestion,
    YearGoal,
} from '@/types';

type HomeProps = {
    reader_name: string | null;
    reading: ReadingSummary[];
    goal: YearGoal;
    today: HomeToday;
    live_session: HomeLiveSession | null;
    next_in_queue: NextInQueue | null;
    recent: RecentBook[];
    suggestion: Suggestion | null;
};

function greeting(hour: number): TranslationKey {
    if (hour >= 5 && hour < 12) {
        return 'Bom dia';
    }

    return hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home({
    reader_name,
    reading,
    goal,
    today,
    live_session: liveSession,
    next_in_queue: nextInQueue,
    recent,
    suggestion,
}: HomeProps) {
    const { t } = useTranslation();
    const hello = t(greeting(new Date().getHours()));
    const [current] = reading;

    return (
        <div className="flex flex-col gap-10">
            <PageHeader
                title={reader_name ? `${hello}, ${reader_name}` : hello}
                headTitle={t('Início')}
                description={t('Um resumo rápido da sua leitura')}
                actions={
                    liveSession && <LiveSessionPill session={liveSession} />
                }
            />

            {current ? (
                <ReadingHero
                    item={current}
                    hasLiveSession={liveSession !== null}
                />
            ) : (
                <NothingInProgress />
            )}

            <div className="flex flex-wrap gap-4">
                <TodayCard today={today} />
                <NextInQueueCard
                    next={nextInQueue}
                    pagesPerDay={today.average}
                />
                <GoalCard goal={goal} dailyGoal={today.goal} />
            </div>

            {suggestion && <TodaySuggestion suggestion={suggestion} />}

            <RecentlyFinished books={recent} />
        </div>
    );
}
