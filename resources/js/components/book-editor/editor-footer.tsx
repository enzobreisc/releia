import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';

export function EditorFooter({
    processing,
    changed,
    onCancel,
    onSave,
}: {
    processing: boolean;
    changed: number;
    onCancel: () => void;
    onSave: () => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3.5">
            <Button
                variant="ghost"
                onClick={onCancel}
                className="h-10 bg-elevated text-[13px]"
            >
                {t('Cancelar')}
            </Button>
            <Button
                onClick={onSave}
                disabled={processing || changed === 0}
                className="h-10 text-[13px]"
            >
                {processing ? t('Salvando…') : t('Salvar')}
                <span className="font-mono text-[11px] opacity-85">⌘S</span>
            </Button>
        </div>
    );
}
