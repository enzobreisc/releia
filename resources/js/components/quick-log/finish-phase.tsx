import { Button, IconButton } from '@/components/form';
import { cardClass } from '@/components/card';
import { SectionTitle } from '@/components/page-header';
import { useFinishSessionForm } from '@/hooks/use-finish-session-form';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { ReadingSummary } from '@/types';
import { PAGE_JUMPS, pageInputClass } from './constants';
import { DiscardButton } from './discard-button';
import { resumeTimer } from './session-requests';
import type { Timer } from './types';

export function FinishPhase({
    timer,
    book,
    onSaved,
    onCancel,
}: {
    timer: Timer;
    book: ReadingSummary;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { t } = useTranslation();
    const session = useFinishSessionForm(timer, book, onSaved);

    function resumeReading() {
        resumeTimer();
        onCancel();
    }

    return (
        <form
            onSubmit={session.submit}
            className="flex flex-1 flex-col gap-3.5"
        >
            <SectionTitle>
                {t('sessão de :minutes min', { minutes: session.minutes })}
            </SectionTitle>
            <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-muted in-data-mobile:text-sm">
                    {t('parei na página')}
                </span>
                <div className="flex items-center gap-2.5">
                    <IconButton
                        label={t('Página anterior')}
                        onClick={() => session.moveTo(session.pageTo - 1)}
                        disabled={session.isAtFirstPage}
                        className="size-12 text-xl in-data-mobile:size-14"
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
                            value={session.pageInput}
                            onChange={(event) =>
                                session.setPageInput(event.target.value)
                            }
                            onFocus={(event) => event.target.select()}
                            aria-label={t('parei na página')}
                            className={cn(
                                pageInputClass,
                                'text-[56px] in-data-mobile:text-[72px]',
                            )}
                        />
                        {book.pages !== null && (
                            <span className="shrink-0 text-base font-bold text-faint">
                                {t('de :pages', { pages: book.pages })}
                            </span>
                        )}
                    </label>
                    <IconButton
                        label={t('Próxima página')}
                        onClick={() => session.moveTo(session.pageTo + 1)}
                        disabled={session.isAtLastPage}
                        className="size-12 text-xl in-data-mobile:size-14"
                    >
                        +
                    </IconButton>
                </div>
                <div className="flex justify-center gap-1.5">
                    {PAGE_JUMPS.map((pages) => (
                        <Button
                            key={pages}
                            variant="ghost"
                            onClick={() =>
                                session.moveTo(session.pageTo + pages)
                            }
                            className="h-8 px-3 font-mono text-xs in-data-mobile:h-10 in-data-mobile:px-4 in-data-mobile:text-sm"
                        >
                            +{pages}
                        </Button>
                    ))}
                </div>
            </div>
            <div
                className={cardClass(
                    'flex justify-between rounded-sm px-3.5 py-3 font-mono text-xs in-data-mobile:text-sm text-secondary',
                )}
            >
                <span>{t(':pages págs', { pages: session.gained })}</span>
                <span>{t(':minutes min', { minutes: session.minutes })}</span>
                <span>
                    {t(':pages págs/h', { pages: session.pagesPerHour })}
                </span>
            </div>
            {session.pageError && (
                <p className="text-center text-xs font-semibold text-danger in-data-mobile:text-sm">
                    {session.pageError}
                </p>
            )}

            <Button
                type="submit"
                disabled={session.isSaveDisabled}
                className="mt-auto h-12 in-data-mobile:h-14 in-data-mobile:text-base"
            >
                {session.isProcessing ? t('Salvando…') : t('Salvar sessão')}
                <span className="font-mono text-[11px] font-medium opacity-60 in-data-mobile:hidden">
                    ↵
                </span>
            </Button>
            <div className="flex justify-between">
                <button
                    type="button"
                    onClick={resumeReading}
                    className="h-9 text-[13px] font-bold text-link hover:underline in-data-mobile:h-11 in-data-mobile:text-sm"
                >
                    {t('voltar a ler')}
                </button>
                <DiscardButton />
            </div>
        </form>
    );
}
