import { Head, Link } from '@inertiajs/react';
import { GroupingStep } from '@/components/bookcase-setup/grouping-step';
import { PreviewStep } from '@/components/bookcase-setup/preview-step';
import { SetupStepper } from '@/components/bookcase-setup/setup-stepper';
import { ShelvesStep } from '@/components/bookcase-setup/shelves-step';
import { Button, buttonClass } from '@/components/form';
import { LibraryBreadcrumb } from '@/components/library-breadcrumb';
import { useBookcaseSetup } from '@/hooks/use-bookcase-setup';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { index as libraryIndex } from '@/routes/library';
import type { SetupBook, ShelfGroupingOption } from '@/types';

type BookcaseSetupProps = {
    books: SetupBook[];
    groupings: ShelfGroupingOption[];
    has_shelves: boolean;
};

export default function BookcaseSetup({
    books,
    groupings,
    has_shelves: hasShelves,
}: BookcaseSetupProps) {
    const { t } = useTranslation();
    const setup = useBookcaseSetup(books, groupings);
    const isPreview = setup.step === 'preview';

    return (
        <>
            <Head title={t('Organizar estante')} />
            <LibraryBreadcrumb current={t('organizar estante')} />

            <div
                className={cn(
                    'mx-auto flex w-full flex-col items-center gap-9 py-[5vh]',
                    isPreview ? 'max-w-260' : 'max-w-150',
                )}
            >
                <SetupStepper
                    labels={[t('separar por'), t('prateleiras'), t('prévia')]}
                    current={setup.stepNumber}
                />

                {setup.step === 'grouping' && (
                    <GroupingStep groupings={groupings} setup={setup} />
                )}
                {setup.step === 'shelves' && setup.grouping && (
                    <ShelvesStep grouping={setup.grouping} setup={setup} />
                )}
                {isPreview && (
                    <PreviewStep
                        sections={setup.sections}
                        replacesShelves={hasShelves}
                    />
                )}

                <div className="flex w-full max-w-150 justify-between gap-3">
                    {setup.step === 'grouping' ? (
                        <Link
                            href={libraryIndex.url()}
                            className={buttonClass('ghost')}
                        >
                            {t('Cancelar')}
                        </Link>
                    ) : (
                        <Button variant="ghost" onClick={setup.goBack}>
                            {t('Voltar')}
                        </Button>
                    )}
                    {isPreview ? (
                        <Button
                            disabled={setup.isSaving}
                            onClick={setup.approve}
                        >
                            {t('Aprovar e montar estante')}
                        </Button>
                    ) : (
                        <Button
                            disabled={!setup.canContinue}
                            onClick={setup.goForward}
                        >
                            {t('Continuar')}
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}
