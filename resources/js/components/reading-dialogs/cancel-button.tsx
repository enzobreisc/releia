import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';

export function CancelButton({
    onClick,
    autoFocus = false,
}: {
    onClick: () => void;
    autoFocus?: boolean;
}) {
    const { t } = useTranslation();

    return (
        <Button
            variant="ghost"
            autoFocus={autoFocus}
            onClick={onClick}
            className="h-10 bg-elevated text-[13px]"
        >
            {t('Cancelar')}
        </Button>
    );
}
