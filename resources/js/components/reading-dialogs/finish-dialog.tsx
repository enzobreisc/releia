import { DatePicker } from '@/components/date-picker';
import { Dialog } from '@/components/dialog';
import { Button, Input } from '@/components/form';
import { StarRating } from '@/components/star-rating';
import { useTranslation } from '@/hooks/use-translation';
import { today } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { ReadingHistory } from '@/types';
import { Chip } from './chip';
import { FinishStats } from './finish-stats';
import { useFinishReading } from './use-finish-reading';

export function FinishDialog({
    title,
    reading,
    previous,
    onClose,
}: {
    title: string;
    reading: ReadingHistory;
    previous: ReadingHistory | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const {
        choice,
        setChoice,
        form,
        undated,
        minimum,
        clientError,
        days,
        pace,
        save,
        skip,
    } = useFinishReading(reading, onClose);

    return (
        <Dialog
            title={`## ${t('terminou :title', { title })}`}
            onClose={onClose}
        >
            <FinishStats
                reading={reading}
                previous={previous}
                days={days}
                pace={pace}
            />

            <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">{t('Terminou em')}</span>
                <div className="flex flex-wrap gap-1.5">
                    <Chip
                        label={t('hoje')}
                        selected={choice === 'today'}
                        onClick={() => setChoice('today')}
                    />
                    <Chip
                        label={t('ontem')}
                        selected={choice === 'yesterday'}
                        onClick={() => setChoice('yesterday')}
                    />
                    <Chip
                        label={t('outra data…')}
                        selected={choice === 'other'}
                        onClick={() => setChoice('other')}
                    />
                    <Chip
                        label={t('sem data')}
                        selected={undated}
                        onClick={() => setChoice('undated')}
                    />
                </div>
                {choice === 'other' && (
                    <DatePicker
                        aria-label={t('Data de término')}
                        max={today()}
                        min={minimum}
                        value={form.data.finished_on}
                        onChange={(value) => form.setData('finished_on', value)}
                        className={cn(
                            'h-10 bg-bg',
                            clientError && 'inset-ring-danger-line',
                        )}
                    />
                )}
                {undated && (
                    <span className="text-[11px] text-faint">
                        {t(
                            'Fica como lido, mas não entra nas estatísticas por período nem na meta do ano.',
                        )}
                    </span>
                )}
                {(clientError ?? form.errors.finished_on) && (
                    <span role="alert" className="text-xs text-danger">
                        {clientError ?? form.errors.finished_on}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-xs text-muted">{t('Sua nota')}</span>
                <StarRating
                    value={form.data.rating || null}
                    onChange={(value) => form.setData('rating', value ?? 0)}
                />
            </div>

            <label className="flex flex-col gap-1.5 text-xs text-muted">
                {t('Em uma linha (opcional)')}
                <Input
                    value={form.data.line}
                    maxLength={280}
                    onChange={(event) =>
                        form.setData('line', event.target.value)
                    }
                    placeholder={t('O que ficou do livro?')}
                    className="h-10.5 bg-bg text-sm"
                />
                <span className="text-[11px] text-faint">
                    {t(
                        'Vira o começo da resenha. A resenha completa fica na aba Resenha.',
                    )}
                </span>
            </label>

            <div className="flex items-center justify-between gap-2">
                <Button
                    variant="ghost"
                    onClick={skip}
                    disabled={form.processing}
                    className="h-10 border-transparent bg-transparent text-[13px] text-muted"
                >
                    {t('Pular')}
                </Button>
                <Button
                    autoFocus
                    onClick={save}
                    disabled={form.processing || clientError !== null}
                    className="h-10 text-[13px]"
                >
                    {form.processing ? t('Salvando…') : t('Salvar')}
                    <span className="font-mono text-[11px] opacity-85">⌘↵</span>
                </Button>
            </div>
        </Dialog>
    );
}
