import { useState } from 'react';
import { pauseTimer } from '@/components/quick-log/session-requests';
import type { Saved, Timer } from '@/components/quick-log/types';
import type { ReadingSummary } from '@/types';

type QuickLogSessionInput = {
    readings: ReadingSummary[];
    timer: Timer | null;
    saved: Saved | null;
};

export function useQuickLogSession({
    readings,
    timer,
    saved,
}: QuickLogSessionInput) {
    const [bookId, setBookId] = useState<number | null>(
        timer?.book_id ?? readings[0]?.book_id ?? null,
    );
    // "Finish" pauses the timer and opens the final page; it only goes away on save or discard.
    const [finishing, setFinishing] = useState(false);
    // Local copy of the summary: rating reloads the page, and the flash does not come back.
    const [done, setDone] = useState<Saved | null>(saved);
    // Compared against the last summary shown, not `done`: closing must not bring the same one back.
    const [shownHash, setShownHash] = useState(saved?.hash ?? null);

    if (saved && saved.hash !== shownHash) {
        setShownHash(saved.hash);
        setDone(saved);
    }

    const activeId = timer?.book_id ?? bookId;
    const selected =
        readings.find((item) => item.book_id === activeId) ??
        readings[0] ??
        null;

    function startFinishing() {
        if (timer && !timer.paused) {
            pauseTimer();
        }

        setFinishing(true);
    }

    return {
        selected,
        done,
        finishing,
        selectBook: setBookId,
        startFinishing,
        cancelFinishing: () => setFinishing(false),
        closeSummary: () => setDone(null),
    };
}
