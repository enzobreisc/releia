import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    type BookFormHandle,
    candidateKey,
    emptyForm,
    readingStateOf,
    toForm,
} from '@/components/add-book/book-form';
import type { Candidate } from '@/types';

export function useAddBookSelection(form: BookFormHandle) {
    const [selected, setSelected] = useState<string | null>(null);
    const [manualMode, setManualMode] = useState(false);
    const editing = selected !== null || manualMode;

    function select(candidate: Candidate) {
        setSelected(candidateKey(candidate));
        setManualMode(false);
        form.clearErrors();
        form.setData({ ...toForm(candidate), ...readingStateOf(form.data) });

        if (candidate.isbn_13) {
            router.reload({
                only: ['preview'],
                data: { isbn: candidate.isbn_13 },
                replace: true,
            });
        }
    }

    function startManual(title: string) {
        setSelected(null);
        setManualMode(true);
        form.clearErrors();
        form.setData({ ...emptyForm, title, ...readingStateOf(form.data) });
    }

    function clearSelection() {
        setSelected(null);
    }

    return {
        selected,
        manualMode,
        editing,
        select,
        startManual,
        clearSelection,
    };
}
