import { Link } from '@inertiajs/react';
import { useTranslation } from '@/hooks/use-translation';
import { index as libraryIndex } from '@/routes/library';

export function LibraryBreadcrumb() {
    const { t } = useTranslation();

    return (
        <Link
            href={libraryIndex.url()}
            className="-mb-3 self-start text-[13px] font-semibold text-secondary hover:text-text"
        >
            {t('Biblioteca')}
            <span className="text-muted"> / {t('adicionar')}</span>
        </Link>
    );
}
