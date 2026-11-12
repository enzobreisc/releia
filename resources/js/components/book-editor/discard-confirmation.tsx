import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';

export function DiscardConfirmation({
    changed,
    onKeepEditing,
    onDiscard,
}: {
    changed: number;
    onKeepEditing: () => void;
    onDiscard: () => void;
}) {
    const { t } = useTranslation();

    return (
        <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-sm bg-warn-fill px-3.5 py-3 text-[13px] text-warn inset-ring inset-ring-warn-line"
        >
            <span className="flex-1">
                {changed === 1
                    ? t('Descartar a alteração?')
                    : t('Descartar :count alterações?', {
                          count: changed,
                      })}
            </span>
            <Button
                variant="ghost"
                autoFocus
                onClick={onKeepEditing}
                className="h-8 bg-elevated px-2.5 text-xs"
            >
                {t('Continuar editando')}
            </Button>
            <Button
                variant="danger"
                onClick={onDiscard}
                className="h-8 px-3 text-xs"
            >
                {t('Descartar')}
            </Button>
        </div>
    );
}
