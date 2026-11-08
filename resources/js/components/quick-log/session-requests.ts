import { router } from '@inertiajs/react';
import { books as startBookRoute } from '@/routes/quick-log';
import { discard, pause, resume } from '@/routes/quick-log/timer';

const KEEP_PAGE_STATE = { preserveState: true };

export function startBook(bookId: number | string) {
    router.post(startBookRoute.url(), { book_id: bookId });
}

export function pauseTimer() {
    router.post(pause.url(), {}, KEEP_PAGE_STATE);
}

export function resumeTimer() {
    router.post(resume.url(), {}, KEEP_PAGE_STATE);
}

export function toggleTimer(isPaused: boolean) {
    router.post(isPaused ? resume.url() : pause.url());
}

export function discardTimer() {
    router.delete(discard.url());
}
