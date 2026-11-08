import { Button } from '@/components/form';
import { PageStepper } from '@/components/live-session/page-stepper';
import { PauseToggleButton } from '@/components/live-session/pause-toggle-button';
import { useTranslation } from '@/hooks/use-translation';
import type { LiveSessionActions } from '@/hooks/use-live-session-actions';
import type { SessionProgress } from '@/hooks/use-session-progress';
import type { LiveSessionTimer } from '@/types';

type SessionControlsProps = {
    timer: LiveSessionTimer;
    progress: SessionProgress;
    actions: LiveSessionActions;
};

export function SessionControls({
    timer,
    progress,
    actions,
}: SessionControlsProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-wrap items-center gap-3.5">
            <PauseToggleButton
                isPaused={timer.paused}
                onToggle={() => actions.togglePause(timer.paused)}
            />
            <PageStepper
                page={timer.page}
                canGoBack={timer.page > timer.start_page}
                canGoForward={!progress.isOnLastPage}
                onMovePage={actions.moveToPage}
            />
            <span className="flex-1" />
            <Button
                variant="ghost"
                disabled={progress.gained <= 0 || actions.isFinishing}
                onClick={actions.requestFinish}
                className="h-13 px-6 font-extrabold"
            >
                {t('Terminar sessão')}
            </Button>
        </div>
    );
}
