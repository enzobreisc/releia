import { router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import type { Candidate } from '@/types';
import { diffsFrom } from './fields';
import type { Diff, EditorForm } from './types';

export function useLookupSuggestions(
    form: EditorForm,
    lookup: Candidate | null | undefined,
) {
    const { t } = useTranslation();
    const [searching, setSearching] = useState(false);
    const [picked, setPicked] = useState<Record<string, boolean>>({});
    const [dismissedLookup, setDismissedLookup] = useState(false);

    const diffs =
        lookup && !dismissedLookup
            ? diffsFrom(form.data, lookup, t('(vazio)'))
            : [];

    function refresh() {
        setDismissedLookup(false);
        setPicked({});
        router.reload({
            only: ['lookup'],
            data: { lookup: form.data.isbn_13 },
            onStart: () => setSearching(true),
            onFinish: () => setSearching(false),
        });
    }

    function applyDiffs() {
        if (!lookup) {
            return;
        }

        for (const diff of diffs) {
            if (picked[diff.key] === false) {
                continue;
            }

            if (diff.key === 'authors') {
                form.setData('authors', lookup.authors);
            } else if (diff.key === 'cover_url') {
                form.setData('cover_url', lookup.cover_url ?? '');
            } else {
                form.setData(diff.key, diff.to);
            }
        }

        setDismissedLookup(true);
    }

    function pick(key: Diff['key'], isPicked: boolean) {
        setPicked({ ...picked, [key]: isPicked });
    }

    return {
        diffs,
        picked,
        searching,
        dismissedLookup,
        refresh,
        applyDiffs,
        pick,
    };
}
