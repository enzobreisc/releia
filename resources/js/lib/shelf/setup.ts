import type { ShelfSection } from './sections';
import type { SetupBook, ShelfGroup, ShelfGroupingOption } from '@/types';

export const DEFAULT_MIN_GROUP_SIZE = 2;
export const MERGED_NAME_SEPARATOR = ' + ';

const CATCH_ALL_KEY = 'catch-all';

/** A shelf the setup is about to create: one group, or several merged under one name. */
export type ShelfDraft = {
    name: string;
    groupKeys: string[];
};

export function suggestedGroupKeys(grouping: ShelfGroupingOption): string[] {
    return grouping.groups
        .filter((group) => group.count >= DEFAULT_MIN_GROUP_SIZE)
        .map((group) => group.key);
}

export function chosenGroups(
    grouping: ShelfGroupingOption,
    groupKeys: string[],
): ShelfGroup[] {
    return grouping.groups.filter((group) => groupKeys.includes(group.key));
}

export function draftShelves(
    grouping: ShelfGroupingOption,
    groupKeys: string[],
    merges: ShelfDraft[],
): ShelfDraft[] {
    const mergedKeys = new Set(merges.flatMap((merge) => merge.groupKeys));
    const singles = chosenGroups(grouping, groupKeys)
        .filter((group) => !mergedKeys.has(group.key))
        .map((group) => ({ name: group.label, groupKeys: [group.key] }));

    return [...merges, ...singles].sort((a, b) => a.name.localeCompare(b.name));
}

export function previewSections(
    books: SetupBook[],
    grouping: ShelfGroupingOption,
    drafts: ShelfDraft[],
    catchAllName: string,
): ShelfSection[] {
    const claimedKeys = new Set(drafts.flatMap((draft) => draft.groupKeys));
    const keyOf = (book: SetupBook) => book.group_keys[grouping.value];

    return [
        ...drafts.map((draft) => ({
            key: draft.groupKeys.join('|'),
            shelfId: null,
            name: draft.name,
            isRemovable: false,
            books: books.filter((book) => {
                const key = keyOf(book);

                return key !== null && draft.groupKeys.includes(key);
            }),
        })),
        {
            key: CATCH_ALL_KEY,
            shelfId: null,
            name: catchAllName,
            isRemovable: false,
            books: books.filter((book) => {
                const key = keyOf(book);

                return key === null || !claimedKeys.has(key);
            }),
        },
    ];
}
