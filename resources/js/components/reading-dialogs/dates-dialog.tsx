import { DatePicker } from '@/components/date-picker';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { ReadingHistory } from '@/types';
import { CancelButton } from './cancel-button';
import { daysBetween } from './days-between';
import { EarlySessionsNotice } from './early-sessions-notice';
import { useReadingDates } from './use-reading-dates';

/** Sessions outside the period do not block: the notice offers the fix. */
export function DatesDialog({
    reading,
    onClose,
}: {
    reading: ReadingHistory;
    onClose: () => void;
}) {
    const { t, plural, ordinal } = useTranslation();
    const {
        form,
        closed,
        canBeUndated,
        start,
        end,
        undated,
        error,
        earlySessions,
        save,
    } = useReadingDates(reading, onClose);

    return (
        <Dialog
            title={`## ${t('datas da :ordinal leitura', { ordinal: ordinal(reading.number, 'feminine') })}`}
            onClose={onClose}
        >
            <form onSubmit={save} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 text-xs text-muted">
                        {t('Começou em')}
                        <DatePicker
                            aria-label={t('Data de início')}
                            max={today()}
                            clearable={undated}
                            value={start}
                            onChange={(value) =>
                                form.setData('started_at', value)
                            }
                            className={cn(
                                'h-10.5 bg-bg text-sm',
                                earlySessions.length > 0 && 'inset-ring-warn',
                            )}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5 text-xs text-muted">
                        {t('Terminou em')}
                        <DatePicker
                            aria-label={t('Data de término')}
                            max={today()}
                            disabled={!closed || undated}
                            value={closed && !undated ? end : ''}
                            onChange={(value) =>
                                form.setData('finished_at', value)
                            }
                            className={cn(
                                'h-10.5 bg-bg text-sm',
                                closed && error && 'inset-ring-danger-line',
                            )}
                        />
                    </div>
                </div>

                {canBeUndated && (
                    <label className="flex items-center gap-2 text-xs text-muted">
                        <input
                            type="checkbox"
                            checked={undated}
                            onChange={(event) =>
                                form.setData('undated', event.target.checked)
                            }
                            className="accent-primary"
                        />
                        {t('Sem data de término (lido há muito tempo)')}
                    </label>
                )}

                {earlySessions.length > 0 && reading.first_session_on && (
                    <EarlySessionsNotice
                        sessionsCount={earlySessions.length}
                        start={start}
                        firstSessionOn={reading.first_session_on}
                        onUseFirstSession={() =>
                            form.setData(
                                'started_at',
                                reading.first_session_on!,
                            )
                        }
                    />
                )}

                {(error ??
                    form.errors.started_at ??
                    form.errors.finished_at) && (
                    <span role="alert" className="text-xs text-danger">
                        {error ??
                            form.errors.started_at ??
                            form.errors.finished_at}
                    </span>
                )}

                {!error && earlySessions.length === 0 && closed && (
                    <span className="text-xs text-muted">
                        {t(':days · :sessions dentro do período', {
                            days: plural(
                                daysBetween(start, end),
                                'dia',
                                'dias',
                            ),
                            sessions: plural(
                                reading.sessions_count,
                                'sessão',
                                'sessões',
                            ),
                        })}
                    </span>
                )}

                <div className="flex justify-end gap-2">
                    <CancelButton onClick={onClose} />
                    <Button
                        type="submit"
                        autoFocus
                        disabled={form.processing || error !== null}
                        className="h-10 text-[13px]"
                    >
                        {t('Salvar datas')}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
