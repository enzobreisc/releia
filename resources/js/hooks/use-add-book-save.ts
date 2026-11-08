import { useEffect } from 'react';
import type { FormEvent } from 'react';
import type { BookFormHandle } from '@/components/add-book/book-form';
import { store } from '@/routes/books';

function submitBook(form: BookFormHandle) {
    form.submit(store());
}

export function useAddBookSave(
    form: BookFormHandle,
    selected: string | null,
    manualMode: boolean,
) {
    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if (
                event.key === 'Enter' &&
                event.metaKey &&
                (selected !== null || manualMode) &&
                !form.processing
            ) {
                event.preventDefault();
                submitBook(form);
            }
        }

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [selected, manualMode, form]);

    return function save(event: FormEvent) {
        event.preventDefault();
        submitBook(form);
    };
}
