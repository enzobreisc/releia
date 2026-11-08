import { useTranslation } from '@/hooks/use-translation';
import { PauseIcon, PlayIcon } from '@/components/icons';

type PauseToggleButtonProps = {
    isPaused: boolean;
    onToggle: () => void;
};

export function PauseToggleButton({
    isPaused,
    onToggle,
}: PauseToggleButtonProps) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            aria-label={isPaused ? t('Continuar') : t('Pausar')}
            onClick={onToggle}
            className="inline-flex size-18 items-center justify-center rounded-full bg-text text-bg hover:bg-white"
        >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
        </button>
    );
}
