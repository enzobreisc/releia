import { useEffect } from 'react';
import {
    type BookFormHandle,
    fillBlankFields,
    toForm,
} from '@/components/add-book/book-form';
import type { Candidate } from '@/types';

export function useAddBookPreview(
    form: BookFormHandle,
    preview: Candidate | null,
) {
    useEffect(() => {
        if (!preview || preview.isbn_13 !== form.data.isbn_13) {
            return;
        }

        const details = toForm(preview);

        form.setData((data) => fillBlankFields(data, details));
    }, [preview]);
}
