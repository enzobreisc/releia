import { Bookcase } from '@/components/bookcase';
import { StepHeading } from '@/components/bookcase-setup/step-heading';
import { useTranslation } from '@/hooks/use-translation';
import type { ShelfSection } from '@/lib/shelf/sections';

export function PreviewStep({
    sections,
    replacesShelves,
}: {
    sections: ShelfSection[];
    replacesShelves: boolean;
}) {
    const { t } = useTranslation();

    return (
        <>
            <StepHeading
                title={t('É assim que a estante vai ficar')}
                description={t(
                    'Depois de aprovar, você ainda pode arrastar livros, renomear e criar prateleiras.',
                )}
            />
            {replacesShelves && (
                <p className="rounded-full bg-warn-fill px-4 py-2 text-[13px] font-semibold text-warn inset-ring inset-ring-warn-line">
                    {t(
                        'Aprovar substitui as prateleiras e a ordem que você montou à mão.',
                    )}
                </p>
            )}
            <div className="w-full">
                <Bookcase sections={sections} />
            </div>
        </>
    );
}
