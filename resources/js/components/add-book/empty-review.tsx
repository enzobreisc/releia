import { LibraryIcon } from '@/components/icons';
import { useTranslation } from '@/hooks/use-translation';

export function EmptyReview() {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-75 flex-col items-center justify-center gap-2 p-6 text-center">
            <LibraryIcon width={28} height={28} className="text-faint" />
            <p className="text-sm font-semibold">
                {t('Nenhum livro escolhido')}
            </p>
            <p className="text-[13px] text-muted">
                {t('Escolha um resultado ao lado ou cadastre à mão.')}
            </p>
        </div>
    );
}
