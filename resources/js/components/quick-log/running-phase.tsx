import { Button } from '@/components/form';
import { useElapsed } from '@/hooks/use-elapsed';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { SECONDS_PER_MINUTE } from './constants';
import { DiscardButton } from './discard-button';
import { MinuteGrid } from './minute-grid';
import { toggleTimer } from './session-requests';
import type { Timer } from './types';

export function RunningPhase({
    timer,
    onStop,
}: {
    timer: Timer;
    onStop: () => void;
}) {
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
                        'flex items-center gap-2 text-xs font-extrabold tracking-widest uppercase in-data-mobile:text-sm',
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
                <span className="font-mono text-xs text-muted in-data-mobile:text-sm">
                    {t('desde a p. :page', { page: timer.start_page })}
                </span>
            </div>
            <div
                role="timer"
                className="text-7xl leading-[0.9] font-extrabold tracking-[-0.05em] tabular-nums in-data-mobile:text-8xl"
            >
                {Math.floor(seconds / SECONDS_PER_MINUTE)}
                <span className="text-[22px] font-bold tracking-normal text-faint in-data-mobile:text-[28px]">
                    {' '}
                    {t('min')}
                </span>
            </div>
            <MinuteGrid seconds={seconds} live={!timer.paused} />
            <span className="text-xs font-medium text-muted in-data-mobile:text-sm">
                {t('cada quadrado acende a cada minuto lido')}
            </span>

            <div className="mt-auto flex flex-col items-center gap-1">
                <div className="flex w-full gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => toggleTimer(timer.paused)}
                        className="h-12 flex-1 in-data-mobile:h-14 in-data-mobile:text-base"
                    >
                        {timer.paused ? t('▶ Continuar') : t('❚❚ Pausar')}
                    </Button>
                    <Button
                        autoFocus
                        onClick={onStop}
                        className="h-12 flex-1 in-data-mobile:h-14 in-data-mobile:text-base"
                    >
                        {t('Terminar')}
                    </Button>
                </div>
                <DiscardButton />
            </div>
        </section>
    );
}
