import { useState } from 'react';
import { GroupChip } from '@/components/bookcase-setup/group-chip';
import { MergeGroupsDialog } from '@/components/bookcase-setup/merge-groups-dialog';
import { StepHeading } from '@/components/bookcase-setup/step-heading';
import { Field, Input } from '@/components/form';
import type { BookcaseSetup } from '@/hooks/use-bookcase-setup';
import { useTranslation } from '@/hooks/use-translation';
import { chosenGroups, MERGED_NAME_SEPARATOR } from '@/lib/shelf/setup';
import type { ShelfGroupingOption } from '@/types';

const MAX_NAME_LENGTH = 60;
const MIN_MERGEABLE_GROUPS = 2;
const TEXT_ACTION_CLASS =
    'text-[13px] font-semibold text-link hover:text-text disabled:text-faint';

export function ShelvesStep({
    grouping,
    setup,
}: {
    grouping: ShelfGroupingOption;
    setup: BookcaseSetup;
}) {
    const { t, plural, translateText } = useTranslation();
    const [isMerging, setIsMerging] = useState(false);
    const restCount = setup.sections.at(-1)?.books.length ?? 0;
    const chosen = chosenGroups(grouping, setup.groupKeys);
    const labelOf = (key: string) =>
        translateText(
            grouping.groups.find((group) => group.key === key)?.label ?? key,
        );

    return (
        <>
            <StepHeading
                title={t('Quais prateleiras você quer?')}
                description={t(
                    'Cada grupo marcado vira uma prateleira. O restante vai para a prateleira abaixo.',
                )}
            />
            <div className="flex w-full flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-2">
                    {grouping.groups.map((group) => (
                        <GroupChip
                            key={group.key}
                            group={group}
                            selected={setup.groupKeys.includes(group.key)}
                            onToggle={() => setup.toggleGroup(group.key)}
                        />
                    ))}
                </div>
                <div className="flex flex-wrap justify-center gap-5">
                    <button
                        type="button"
                        className={TEXT_ACTION_CLASS}
                        onClick={setup.selectAllGroups}
                    >
                        {t('Marcar todas')}
                    </button>
                    <button
                        type="button"
                        className={TEXT_ACTION_CLASS}
                        onClick={setup.clearGroups}
                    >
                        {t('Desmarcar todas')}
                    </button>
                    <button
                        type="button"
                        className={TEXT_ACTION_CLASS}
                        disabled={chosen.length < MIN_MERGEABLE_GROUPS}
                        onClick={() => setIsMerging(true)}
                    >
                        {t('Unir prateleiras')}
                    </button>
                </div>
            </div>
            {setup.merges.length > 0 && (
                <ul className="flex w-full flex-col divide-y rounded-md bg-surface inset-ring inset-ring-border">
                    {setup.merges.map((merge) => (
                        <li
                            key={merge.groupKeys.join('|')}
                            className="flex items-center justify-between gap-4 px-5 py-3.5"
                        >
                            <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-sm font-extrabold">
                                    {merge.name}
                                </span>
                                <span className="truncate font-mono text-[11px] text-muted">
                                    {merge.groupKeys
                                        .map(labelOf)
                                        .join(MERGED_NAME_SEPARATOR)}
                                </span>
                            </span>
                            <button
                                type="button"
                                className={TEXT_ACTION_CLASS}
                                onClick={() => setup.undoMerge(merge)}
                            >
                                {t('Separar')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex w-full flex-col gap-2.5 rounded-md bg-surface p-5 inset-ring inset-ring-border">
                <Field label={t('Prateleira para o restante')}>
                    <Input
                        required
                        maxLength={MAX_NAME_LENGTH}
                        value={setup.catchAllName}
                        onChange={(event) =>
                            setup.setCatchAllName(event.target.value)
                        }
                    />
                </Field>
                <p className="font-mono text-xs text-muted">
                    {t(':shelves · :books no restante', {
                        shelves: plural(
                            setup.drafts.length + 1,
                            'prateleira',
                            'prateleiras',
                        ),
                        books: plural(restCount, 'livro', 'livros'),
                    })}
                </p>
            </div>
            {isMerging && (
                <MergeGroupsDialog
                    groups={chosen}
                    onMerge={setup.mergeGroups}
                    onClose={() => setIsMerging(false)}
                />
            )}
        </>
    );
}
