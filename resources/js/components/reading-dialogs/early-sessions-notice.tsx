import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';

export function EarlySessionsNotice({
    sessionsCount,
    start,
    firstSessionOn,
    onUseFirstSession,
}: {
    sessionsCount: number;
    start: string;
    firstSessionOn: string;
    onUseFirstSession: () => void;
}) {
    const { t, plural, shortDate } = useTranslation();

    return (
        <div className="flex flex-col items-start gap-2 rounded-sm bg-warn-fill px-3.5 py-3 text-xs leading-relaxed text-warn inset-ring inset-ring-warn-line">
            <span>
                {t(':sessions antes do novo início (:date).', {
                    sessions: plural(
                        sessionsCount,
                        'sessão fica',
                        'sessões ficam',
                    ),
                    date: shortDate(start),
                })}
            </span>
            <Button
                variant="ghost"
                onClick={onUseFirstSession}
                className="h-8 px-3.5 text-xs text-warn inset-ring-warn-line"
            >
                {t('Usar :date como início', {
                    date: shortDate(firstSessionOn),
                })}
            </Button>
        </div>
    );
}
