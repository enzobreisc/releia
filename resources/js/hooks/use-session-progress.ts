import { useTranslation } from '@/hooks/use-translation';
import { minutesToRead } from '@/lib/session';
import type { LiveSessionTimer, ReadingSummary } from '@/types';

const MS_PER_MINUTE = 60_000;

type SessionProgressInput = {
    reading: ReadingSummary;
    timer: LiveSessionTimer;
    pagesPerHour: number | null;
    now: Date;
};

/** Pages gained and the estimated finish, derived from the timer and the reading pace. */
export function useSessionProgress({
    reading,
    timer,
    pagesPerHour,
    now,
}: SessionProgressInput) {
    const { clockTime } = useTranslation();

    const gained = timer.page - timer.start_page;
    const isOnLastPage = reading.pages !== null && timer.page >= reading.pages;
    const pagesLeft =
        reading.pages === null ? null : reading.pages - timer.page;
    const minutesLeft =
        pagesLeft !== null && pagesLeft > 0 && pagesPerHour !== null
            ? minutesToRead(pagesLeft, pagesPerHour)
            : null;
    const finishTime =
        minutesLeft === null
            ? null
            : clockTime(new Date(now.getTime() + minutesLeft * MS_PER_MINUTE));

    return { gained, isOnLastPage, pagesLeft, minutesLeft, finishTime };
}

export type SessionProgress = ReturnType<typeof useSessionProgress>;
