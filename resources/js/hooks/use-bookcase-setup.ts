import { router } from '@inertiajs/react';
import { useState } from 'react';
import { useStored } from '@/hooks/use-stored';
import { useTranslation } from '@/hooks/use-translation';
import {
    draftShelves,
    previewSections,
    suggestedGroupKeys,
} from '@/lib/shelf/setup';
import type { ShelfDraft } from '@/lib/shelf/setup';
import { organize } from '@/routes/bookcase';
import type {
    SetupBook,
    ShelfGroupingOption,
    ShelfGroupingValue,
} from '@/types';

export const SETUP_STEPS = ['grouping', 'shelves', 'preview'] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

function withoutGroups(merges: ShelfDraft[], groupKeys: string[]) {
    return merges
        .map((merge) => ({
            ...merge,
            groupKeys: merge.groupKeys.filter(
                (key) => !groupKeys.includes(key),
            ),
        }))
        .filter((merge) => merge.groupKeys.length > 0);
}

export function useBookcaseSetup(
    books: SetupBook[],
    groupings: ShelfGroupingOption[],
) {
    const { t } = useTranslation();
    const [, setLibraryView] = useStored<'grid' | 'shelf'>(
        'library.view',
        'grid',
    );
    const [step, setStep] = useState<SetupStep>('grouping');
    const [groupingValue, setGroupingValue] =
        useState<ShelfGroupingValue | null>(null);
    const [groupKeys, setGroupKeys] = useState<string[]>([]);
    const [merges, setMerges] = useState<ShelfDraft[]>([]);
    const [catchAllName, setCatchAllName] = useState(t('Outros'));
    const [isSaving, setIsSaving] = useState(false);
    const grouping =
        groupings.find((option) => option.value === groupingValue) ?? null;
    const stepIndex = SETUP_STEPS.indexOf(step);
    const shelfName = catchAllName.trim();
    const drafts =
        grouping === null ? [] : draftShelves(grouping, groupKeys, merges);

    function chooseGrouping(option: ShelfGroupingOption) {
        setGroupingValue(option.value);
        setGroupKeys(suggestedGroupKeys(option));
        setMerges([]);
    }

    function toggleGroup(key: string) {
        if (groupKeys.includes(key)) {
            setGroupKeys(groupKeys.filter((chosen) => chosen !== key));
            setMerges(withoutGroups(merges, [key]));
        } else {
            setGroupKeys([...groupKeys, key]);
        }
    }

    function mergeGroups(merge: ShelfDraft) {
        setMerges([...withoutGroups(merges, merge.groupKeys), merge]);
    }

    function approve() {
        if (grouping === null) {
            return;
        }

        setLibraryView('shelf');
        router.post(
            organize.url(),
            {
                grouping: grouping.value,
                shelves: drafts.map((draft) => ({
                    name: draft.name,
                    group_keys: draft.groupKeys,
                })),
                catch_all_name: shelfName,
            },
            {
                onStart: () => setIsSaving(true),
                onFinish: () => setIsSaving(false),
            },
        );
    }

    return {
        step,
        stepNumber: stepIndex + 1,
        grouping,
        groupKeys,
        merges,
        drafts,
        catchAllName,
        isSaving,
        canContinue: grouping !== null && shelfName !== '',
        sections:
            grouping === null
                ? []
                : previewSections(books, grouping, drafts, shelfName),
        chooseGrouping,
        toggleGroup,
        mergeGroups,
        undoMerge: (merge: ShelfDraft) =>
            setMerges(merges.filter((other) => other !== merge)),
        selectAllGroups: () =>
            setGroupKeys(grouping?.groups.map((group) => group.key) ?? []),
        clearGroups: () => {
            setGroupKeys([]);
            setMerges([]);
        },
        setCatchAllName,
        goBack: () => setStep(SETUP_STEPS[stepIndex - 1]),
        goForward: () => setStep(SETUP_STEPS[stepIndex + 1]),
        approve,
    };
}

export type BookcaseSetup = ReturnType<typeof useBookcaseSetup>;
