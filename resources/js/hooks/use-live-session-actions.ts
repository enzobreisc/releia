import { router } from '@inertiajs/react';
import { useState } from 'react';
import {
    finish,
    page as pageRoute,
    pause,
    resume,
} from '@/routes/live-session';

export function useLiveSessionActions(isOnLastPage: boolean) {
    const [isFinishing, setFinishing] = useState(false);
    const [isAskingToFinishBook, setAskingToFinishBook] = useState(false);

    function moveToPage(page: number) {
        router.patch(pageRoute.url(), { page }, { preserveScroll: true });
    }

    function togglePause(isPaused: boolean) {
        router.post((isPaused ? resume : pause).url());
    }

    function finishSession(shouldFinishBook = false) {
        router.post(
            finish.url(),
            { finish_book: shouldFinishBook },
            {
                onStart: () => setFinishing(true),
                onFinish: () => setFinishing(false),
            },
        );
    }

    function requestFinish() {
        if (isOnLastPage) {
            setAskingToFinishBook(true);

            return;
        }

        finishSession();
    }

    function closeFinishPrompt() {
        setAskingToFinishBook(false);
    }

    return {
        isFinishing,
        isFinishPromptOpen: isAskingToFinishBook && isOnLastPage,
        moveToPage,
        togglePause,
        finishSession,
        requestFinish,
        closeFinishPrompt,
    };
}

export type LiveSessionActions = ReturnType<typeof useLiveSessionActions>;
