import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import {
    MIN_SESSION_MINUTES,
    MINUTES_PER_HOUR,
    SECONDS_PER_MINUTE,
} from '@/components/quick-log/constants';
import type { Timer } from '@/components/quick-log/types';
import { useElapsed } from '@/hooks/use-elapsed';
import { finish } from '@/routes/quick-log/timer';
import type { ReadingSummary } from '@/types';

export function useFinishSessionForm(
    timer: Timer,
    book: ReadingSummary,
    onSaved: () => void,
) {
    const seconds = useElapsed(timer);
    const minutes = Math.max(
        MIN_SESSION_MINUTES,
        Math.round(seconds / SECONDS_PER_MINUTE),
    );
    const form = useForm({ page_to: String(timer.start_page + 1) });
    const pageTo = Number(form.data.page_to) || 0;
    const firstPage = timer.start_page + 1;
    const lastPage = book.pages ?? Infinity;
    const gained = Math.max(0, pageTo - timer.start_page);
    const pagesPerHour = Math.round(gained / (minutes / MINUTES_PER_HOUR));

    function moveTo(page: number) {
        const bounded = Math.min(lastPage, Math.max(firstPage, page));
        form.setData('page_to', String(bounded));
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        form.post(finish.url(), { onSuccess: onSaved });
    }

    return {
        minutes,
        gained,
        pagesPerHour,
        pageTo,
        pageInput: form.data.page_to,
        pageError: form.errors.page_to,
        isProcessing: form.processing,
        isSaveDisabled: form.processing || gained === 0,
        isAtFirstPage: pageTo <= firstPage,
        isAtLastPage: pageTo >= lastPage,
        setPageInput: (value: string) => form.setData('page_to', value),
        moveTo,
        submit,
    };
}
