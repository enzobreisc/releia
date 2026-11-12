import { useTranslation } from '@/hooks/use-translation';
import type { ReadingHistory } from '@/types';

export function FinishStats({
    reading,
    previous,
    days,
    pace,
}: {
    reading: ReadingHistory;
    previous: ReadingHistory | null;
    days: number | null;
    pace: number | null;
}) {
    const { t, plural, ordinal } = useTranslation();

    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-sm bg-bg px-3 py-2.5 font-mono text-xs text-nav">
            {days !== null && <span>{plural(days, 'dia', 'dias')}</span>}
            <span>{plural(reading.sessions_count, 'sessão', 'sessões')}</span>
            {pace !== null && (
                <span>{t(':pages págs/dia', { pages: pace })}</span>
            )}
            {previous?.days && (
                <span className="text-muted">
                    {t('da :ordinal vez: :duration', {
                        ordinal: ordinal(previous.number, 'feminine'),
                        duration: plural(previous.days, 'dia', 'dias'),
                    })}
                </span>
            )}
        </div>
    );
}
