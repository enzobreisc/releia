import { cardClass } from '@/components/card';
import { WorkRow } from '@/components/author/work-row';
import { useTranslation } from '@/hooks/use-translation';
import type { Works } from '@/hooks/use-author-works';

export function OtherWorksBody({
    works,
    hasFailed,
    name,
}: {
    works: Works | null;
    hasFailed: boolean;
    name: string;
}) {
    const { t } = useTranslation();

    if (hasFailed) {
        return (
            <p className="text-sm text-muted">
                {t(
                    'Não foi possível buscar as obras agora. Tente de novo mais tarde.',
                )}
            </p>
        );
    }

    if (works === null) {
        return (
            <p className="font-mono text-xs text-muted">
                {t('buscando obras…')}
            </p>
        );
    }

    if (!works.verified) {
        return (
            <p className={cardClass('p-4 text-sm text-muted')}>
                {t(
                    'Não foi possível identificar este autor com segurança (há homônimos), então não mostramos obras que poderiam ser de outra pessoa.',
                )}
            </p>
        );
    }

    if (works.items.length === 0) {
        return (
            <p className="text-sm text-muted">
                {t('Você já tem todas as obras que encontramos.')}
            </p>
        );
    }

    return (
        <ul className={cardClass('flex flex-col overflow-hidden')}>
            {works.items.map((work) => (
                <WorkRow
                    key={work.work_key ?? work.title}
                    work={work}
                    authorName={name}
                />
            ))}
        </ul>
    );
}
