import { Dialog } from '@/components/dialog';
import { Button, Input } from '@/components/form';
import { StarRating } from '@/components/star-rating';
import { useTranslation } from '@/hooks/use-translation';
import type { ReadingHistory } from '@/types';
import { OTHER_REASON, REASONS } from './abandon-reasons';
import { CancelButton } from './cancel-button';
import { Chip } from './chip';
import { useAbandonReading } from './use-abandon-reading';

export function AbandonDialog({
    title,
    reading,
    pages,
    onClose,
}: {
    title: string;
    reading: ReadingHistory;
    pages: number | null;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const {
        choice,
        setChoice,
        other,
        setOther,
        rate,
        setRate,
        rating,
        setRating,
        processing,
        percent,
        submit,
    } = useAbandonReading(reading, pages, onClose);

    return (
        <Dialog
            title={`## ${t('abandonar :title?', { title })}`}
            onClose={onClose}
        >
            <p className="text-sm leading-relaxed text-secondary">
                {t('Você parou na p. :page.', {
                    page: `${reading.current_page}${pages ? ` ${t('de')} ${pages}` : ''}${percent !== null ? ` (${percent}%)` : ''}`,
                })}{' '}
                {t('A página fica guardada para retomar.')}
            </p>
            <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">
                    {t('Por quê? (opcional)')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                    {[...REASONS, OTHER_REASON].map((reason) => (
                        <Chip
                            key={reason}
                            label={t(reason)}
                            tone="warn"
                            selected={choice === reason}
                            onClick={() =>
                                setChoice(choice === reason ? null : reason)
                            }
                        />
                    ))}
                </div>
                {choice === OTHER_REASON && (
                    <Input
                        autoFocus
                        aria-label={t('Outro motivo')}
                        maxLength={120}
                        value={other}
                        onChange={(event) => setOther(event.target.value)}
                        placeholder={t('Conte em poucas palavras')}
                        className="h-10 bg-bg"
                    />
                )}
            </div>
            <label className="flex items-center gap-2 text-[13px] text-secondary">
                <input
                    type="checkbox"
                    checked={rate}
                    onChange={(event) => setRate(event.target.checked)}
                    className="size-4 accent-primary"
                />
                {t('Dar uma nota mesmo assim')}
            </label>
            {rate && <StarRating value={rating} onChange={setRating} />}
            <div className="flex justify-end gap-2">
                <CancelButton onClick={onClose} />
                <Button
                    variant="ghost"
                    autoFocus
                    onClick={submit}
                    disabled={processing}
                    className="h-10 bg-warn-fill text-[13px] text-warn inset-ring-warn-line hover:bg-warn-fill/80"
                >
                    {t('Abandonar')}
                </Button>
            </div>
        </Dialog>
    );
}
