import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { start } from '@/routes/quick-log/timer';
import type { ReadingSummary } from '@/types';

export function useStartSessionForm(book: ReadingSummary) {
    const form = useForm({
        book_id: book.book_id,
        start_page: String(book.current_page),
    });
    const page = Number(form.data.start_page) || 0;

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(start.url());
    }

    function stepPage(delta: number) {
        const next = Math.max(book.current_page, page + delta);
        form.setData('start_page', String(next));
    }

    return {
        startPage: form.data.start_page,
        startPageError: form.errors.start_page,
        isProcessing: form.processing,
        isAtStart: page <= book.current_page,
        setStartPage: (value: string) => form.setData('start_page', value),
        stepPage,
        submit,
    };
}
