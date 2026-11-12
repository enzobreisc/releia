import { Link } from '@inertiajs/react';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { index as libraryIndex } from '@/routes/library';

export function NothingInProgress() {
    const { t } = useTranslation();

    return (
        <section className="flex flex-col gap-3">
            <SectionTitle>{t('lendo agora')}</SectionTitle>
            <p className="text-sm text-muted">
                {t('Nenhum livro em andamento.')}{' '}
                <Link
                    href={libraryIndex.url()}
                    className="text-link hover:underline"
                >
                    {t('Abrir a biblioteca')}
                </Link>
            </p>
        </section>
    );
}
