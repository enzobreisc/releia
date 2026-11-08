import { OtherWorksBody } from '@/components/author/other-works-body';
import { SectionTitle } from '@/components/page-header';
import { useTranslation } from '@/hooks/use-translation';
import { useAuthorWorks } from '@/hooks/use-author-works';

export function OtherWorksSection({
    authorId,
    name,
}: {
    authorId: number;
    name: string;
}) {
    const { t } = useTranslation();
    const { works, hasFailed } = useAuthorWorks(authorId);

    return (
        <section className="flex flex-col gap-4">
            <SectionTitle>
                {works?.verified
                    ? t('Outras obras de :name · :count', {
                          name,
                          count: works.items.length,
                      })
                    : t('Outras obras de :name', { name })}
            </SectionTitle>
            <OtherWorksBody works={works} hasFailed={hasFailed} name={name} />
        </section>
    );
}
