import { DiscardSessionButton } from '@/components/discard-session-button';
import { useTranslation } from '@/hooks/use-translation';

export function SessionHintBar({ gained }: { gained: number }) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-[13px] font-semibold text-muted">
                {gained <= 0 && t('Avance ao menos uma página para terminar')}
            </span>
            <DiscardSessionButton />
        </div>
    );
}
