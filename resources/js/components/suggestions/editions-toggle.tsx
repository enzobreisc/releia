import { useTranslation } from '@/hooks/use-translation';

export function EditionsToggle({
    open,
    onToggle,
}: {
    open: boolean;
    onToggle: () => void;
}) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="self-start text-[13px] font-bold text-link hover:underline"
        >
            {open ? t('− Esconder edições') : t('+ Escolher edição')}
        </button>
    );
}
