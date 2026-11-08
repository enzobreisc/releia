import { IconButton } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';

type PageStepperProps = {
    page: number;
    canGoBack: boolean;
    canGoForward: boolean;
    onMovePage: (page: number) => void;
};

export function PageStepper({
    page,
    canGoBack,
    canGoForward,
    onMovePage,
}: PageStepperProps) {
    const { t } = useTranslation();

    return (
        <div className="flex h-13 items-center rounded-full bg-elevated inset-ring inset-ring-strong">
            <IconButton
                label={t('Voltar uma página')}
                variant="plain"
                disabled={!canGoBack}
                onClick={() => onMovePage(page - 1)}
                className="size-13 text-[22px]"
            >
                −
            </IconButton>
            <span className="min-w-16 text-center font-mono text-sm font-medium">
                {t('p. :page', { page })}
            </span>
            <IconButton
                label={t('Avançar uma página')}
                variant="plain"
                disabled={!canGoForward}
                onClick={() => onMovePage(page + 1)}
                className="size-13 text-[22px]"
            >
                +
            </IconButton>
        </div>
    );
}
