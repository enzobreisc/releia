import type { HomeLiveSession, LiveSessionTimer } from '@/types';
import type { LiveTimerState, ReadingRow } from '../state/types';
import {
    averagePagesPerReadingDay,
    lastWeekLevels,
    pagesOn,
    streak,
} from '../domain/activity';
import { bookOf } from '../domain/books';
import { dailyGoal } from '../domain/dashboard';
import { pagesPerHour } from '../domain/progress';
import type { ReadModel } from '../domain/read-model';
import { elapsedSeconds } from '../domain/reading-timer';
import { readingSummary } from './reading';

/** LiveSessionPresenter::timer. The page counts from the elapsed time the server computes. */
function liveSessionTimer(timer: LiveTimerState, now: Date): LiveSessionTimer {
    return {
        start_page: timer.start_page,
        page: timer.page,
        started_at: timer.started_at,
        elapsed: elapsedSeconds(timer, now),
        paused: timer.paused_at !== null,
    };
}

export function liveSessionSummary(model: ReadModel): HomeLiveSession | null {
    const timer = model.state.runtime.liveTimer;

    if (timer === null) {
        return null;
    }

    return {
        title: bookOf(model, timer.book_id).title,
        timer: liveSessionTimer(timer, model.now),
    };
}

/** The props of the live session page: the reader's reading, the timer and the day's numbers. */
export function liveSessionPage(
    model: ReadModel,
    timer: LiveTimerState,
    reading: ReadingRow,
) {
    return {
        reading: readingSummary(model, reading),
        timer: liveSessionTimer(timer, model.now),
        pages_per_hour: pagesPerHour(model, reading),
        today: {
            pages: pagesOn(model, model.today),
            average: averagePagesPerReadingDay(model),
            goal: dailyGoal(model),
        },
        week: lastWeekLevels(model),
        streak: streak(model),
    };
}
