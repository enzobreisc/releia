import { Button } from '@/components/form';
import { useTranslation } from '@/hooks/use-translation';

export function Pager({
    page,
    pageCount,
    onChange,
}: {
    page: number;
    pageCount: number;
    onChange: (page: number) => void;
}) {
    const { t } = useTranslation();

    return (
        <nav
            aria-label={t('Estante')}
            className="flex items-center justify-between gap-3"
        >
            <Button
                variant="outline"
                className="h-10"
                disabled={page === 0}
                onClick={() => onChange(page - 1)}
            >
                ‹ {t('Anterior')}
            </Button>
            <span className="font-mono text-xs text-secondary">
                {t('Estante :page de :total', {
                    page: page + 1,
                    total: pageCount,
                })}
            </span>
            <Button
                variant="outline"
                className="h-10"
                disabled={page === pageCount - 1}
                onClick={() => onChange(page + 1)}
            >
                {t('Próxima')} ›
            </Button>
        </nav>
    );
}
