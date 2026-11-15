import { StepHeading } from '@/components/bookcase-setup/step-heading';
import type { BookcaseSetup } from '@/hooks/use-bookcase-setup';
import { useTranslation } from '@/hooks/use-translation';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ShelfGroupingOption, ShelfGroupingValue } from '@/types';

const DESCRIPTIONS: Record<ShelfGroupingValue, TranslationKey> = {
    publisher: 'Cada editora ganha a sua prateleira.',
    author: 'Os livros de um mesmo autor ficam juntos.',
    genre: 'Romance, ficção, história: cada gênero em uma prateleira.',
    series: 'Cada série em uma prateleira; os livros avulsos ficam juntos.',
};

export function GroupingStep({
    groupings,
    setup,
}: {
    groupings: ShelfGroupingOption[];
    setup: BookcaseSetup;
}) {
    const { t, plural } = useTranslation();

    return (
        <>
            <StepHeading
                title={t('Como você quer separar os livros?')}
                description={t(
                    'Escolha um critério. Dá para refazer a organização quando quiser.',
                )}
            />
            <div
                role="radiogroup"
                aria-label={t('Como você quer separar os livros?')}
                className="flex w-full flex-col gap-2.5"
            >
                {groupings.map((option) => {
                    const selected = setup.grouping?.value === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={option.groups.length === 0}
                            onClick={() => setup.chooseGrouping(option)}
                            className={cn(
                                'flex items-center gap-4 rounded-md px-5 py-4 text-left inset-ring disabled:opacity-50',
                                selected
                                    ? 'bg-active inset-ring-primary'
                                    : 'bg-surface inset-ring-border enabled:hover:bg-elevated',
                            )}
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    'flex size-5 shrink-0 items-center justify-center rounded-full inset-ring-2',
                                    selected
                                        ? 'inset-ring-primary'
                                        : 'inset-ring-strong',
                                )}
                            >
                                {selected && (
                                    <span className="size-2.5 rounded-full bg-accent" />
                                )}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="text-base font-extrabold tracking-tight">
                                    {option.label}
                                </span>
                                <span className="text-[13px] font-medium text-secondary">
                                    {t(DESCRIPTIONS[option.value])}
                                </span>
                            </span>
                            <span className="shrink-0 font-mono text-[11px] text-muted">
                                {plural(
                                    option.groups.length,
                                    'grupo',
                                    'grupos',
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
