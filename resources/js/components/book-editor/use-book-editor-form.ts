import { useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { update } from '@/routes/books';
import type { BookDetail } from '@/types';
import { countChanges, initialFields } from './fields';
import type { Fields } from './types';

export function useBookEditorForm(book: BookDetail, onClose: () => void) {
    const initial = useRef(initialFields(book)).current;
    const form = useForm<Fields>(initial);
    const [confirmClose, setConfirmClose] = useState(false);

    const changed = countChanges(form.data, initial);

    function requestClose() {
        if (changed > 0) {
            setConfirmClose(true);
        } else {
            onClose();
        }
    }

    function save() {
        form.transform((data) => ({
            ...data,
            cover_file: data.cover_file ?? undefined,
            _method: 'patch',
        }));
        form.post(update(book.id).url, {
            preserveScroll: true,
            forceFormData: form.data.cover_file !== null,
            onSuccess: onClose,
        });
    }

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                event.preventDefault();
                requestClose();
            } else if (event.metaKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                save();
            }
        }

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    });

    return {
        form,
        changed,
        confirmClose,
        keepEditing: () => setConfirmClose(false),
        requestClose,
        save,
    };
}
