import { Button, IconButton } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { useStartSessionForm } from '@/hooks/use-start-session-form';
import { cn } from '@/lib/utils';
import type { ReadingSummary } from '@/types';
import { pageInputClass } from './constants';
import { MinuteGrid } from './minute-grid';
import { PlayIcon } from './play-icon';

export function IdlePhase({ book }: { book: ReadingSummary }) {
    const { t } = useTranslation();
    const session = useStartSessionForm(book);

    return (
        <form
            onSubmit={session.submit}
            className="flex flex-1 flex-col gap-3.5"
        >
            <MinuteGrid seconds={0} live={false} />
            <p className="text-xs font-medium text-muted in-data-mobile:text-sm">
                {t('cada quadrado acende a cada minuto lido')}
            </p>

            <div className="mt-auto flex flex-col gap-2">
                <label className="flex flex-col gap-2 text-xs font-bold text-muted in-data-mobile:text-sm">
                    {t('começo na página')}
                    <span className="flex items-center gap-2.5">
                        <IconButton
                            label={t('Página anterior')}
                            onClick={() => session.stepPage(-1)}
                            disabled={session.isAtStart}
                            className="size-12 text-xl in-data-mobile:size-14"
                        >
                            −
                        </IconButton>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={book.current_page}
                            value={session.startPage}
                            onChange={(event) =>
                                session.setStartPage(event.target.value)
                            }
                            className={cn(
                                pageInputClass,
                                'text-5xl text-text in-data-mobile:text-6xl',
                            )}
                        />
                        <IconButton
                            label={t('Próxima página')}
                            onClick={() => session.stepPage(1)}
                            className="size-12 text-xl in-data-mobile:size-14"
                        >
                            +
                        </IconButton>
                    </span>
                </label>
                {session.startPageError && (
                    <p className="text-xs font-semibold text-danger in-data-mobile:text-sm">
                        {session.startPageError}
                    </p>
                )}
                <Button
                    type="submit"
                    autoFocus
                    disabled={session.isProcessing}
                    className="h-12 in-data-mobile:h-14 in-data-mobile:text-base"
                >
                    <PlayIcon />
                    {t('Começar a ler')}
                    <span className="font-mono text-[11px] font-medium opacity-60 in-data-mobile:hidden">
                        ↵
                    </span>
                </Button>
            </div>
        </form>
    );
}
