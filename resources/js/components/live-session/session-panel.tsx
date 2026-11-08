import { FinishBookPrompt } from '@/components/live-session/finish-book-prompt';
import { SessionControls } from '@/components/live-session/session-controls';
import { SessionHeading } from '@/components/live-session/session-heading';
import { SessionHintBar } from '@/components/live-session/session-hint-bar';
import { SessionProgressBar } from '@/components/session-progress-bar';
import type { LiveSessionActions } from '@/hooks/use-live-session-actions';
import type { SessionProgress } from '@/hooks/use-session-progress';
import { useTranslation } from '@/hooks/use-translation';
import { formatStopwatch } from '@/lib/session';
import type { LiveSessionTimer, ReadingSummary } from '@/types';

type SessionPanelProps = {
    reading: ReadingSummary;
    timer: LiveSessionTimer;
    seconds: number;
    progress: SessionProgress;
    actions: LiveSessionActions;
};

export function SessionPanel({
    reading,
    timer,
    seconds,
    progress,
    actions,
}: SessionPanelProps) {
    const { t } = useTranslation();

    return (
        <section
            aria-label={t('Sessão em andamento')}
            className="flex w-full max-w-150 min-w-0 flex-1 basis-96 flex-col gap-7"
        >
            <SessionHeading
                title={reading.title}
                authors={reading.authors}
                isPaused={timer.paused}
            />

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

            {actions.isFinishPromptOpen ? (
                <FinishBookPrompt
                    title={reading.title}
                    pages={progress.gained}
                    seconds={seconds}
                    disabled={actions.isFinishing}
                    onFinishBook={() => actions.finishSession(true)}
                    onFinishSessionOnly={() => actions.finishSession()}
                    onBack={actions.closeFinishPrompt}
                />
            ) : (
                <SessionControls
                    timer={timer}
                    progress={progress}
                    actions={actions}
                />
            )}

            <SessionHintBar gained={progress.gained} />
        </section>
    );
}
