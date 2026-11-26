import { appIsoTimestamp } from '../support/app-time';
import { phpRound } from '../support/php-round';
import type {
    DemoState,
    LiveTimerState,
    ReadingRow,
    ReadingSessionRow,
} from '../state/types';
import { bookRowOf } from './rows';
import {
    changeReadingStatus,
    readingForBook,
    registerSession,
    reject,
    touch,
} from './reading-writes';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINIMUM_MINUTES = 1;

export type TimerClock = { now: Date; today: string };

type TimerStart = { bookId: number; startPage: number };

function secondsBetween(from: string, to: Date): number {
    return Math.trunc(
        Math.abs(to.getTime() - Date.parse(from)) / MILLISECONDS_PER_SECOND,
    );
}

/** ReadingTimer::elapsedSeconds: the time since the start, minus the paused time; frozen while paused. */
export function elapsedSeconds(timer: LiveTimerState, now: Date): number {
    const end = timer.paused_at === null ? now : new Date(timer.paused_at);

    return Math.max(
        0,
        secondsBetween(timer.started_at, end) - timer.paused_seconds,
    );
}

/** ReadingTimer::start: the timer begins on the page the reader is on, and a "want to read" book starts reading. */
export function startTimer(
    state: DemoState,
    start: TimerStart,
    clock: TimerClock,
): void {
    const reading = readingForBook(state, start.bookId);
    const { pages } = bookRowOf(state, start.bookId);

    if (start.startPage < reading.current_page) {
        reject(state, 'Você já registrou até a pág. :page.', {
            page: reading.current_page,
        });
    }

    if (pages !== null && start.startPage >= pages) {
        reject(state, 'O livro tem :pages páginas.', { pages });
    }

    if (reading.status === 'want_to_read') {
        changeReadingStatus(state, reading.id, 'reading', clock.today);
    }

    state.runtime.liveTimer = {
        book_id: start.bookId,
        start_page: start.startPage,
        page: start.startPage,
        started_at: appIsoTimestamp(clock.now),
        paused_at: null,
        paused_seconds: 0,
    };
}

/** ReadingTimer::movePage: the page stays between the starting page and the book's last page. */
export function moveTimerPage(state: DemoState, page: number): void {
    const timer = state.runtime.liveTimer;

    if (timer === null) {
        return;
    }

    const { pages } = bookRowOf(state, timer.book_id);
    timer.page = Math.max(timer.start_page, Math.min(pages ?? page, page));
}

export function pauseTimer(state: DemoState, now: Date): void {
    const timer = state.runtime.liveTimer;

    if (timer === null || timer.paused_at !== null) {
        return;
    }

    timer.paused_at = appIsoTimestamp(now);
}

export function resumeTimer(state: DemoState, now: Date): void {
    const timer = state.runtime.liveTimer;

    if (timer === null || timer.paused_at === null) {
        return;
    }

    timer.paused_seconds += secondsBetween(timer.paused_at, now);
    timer.paused_at = null;
}

/**
 * Runs `register` with the starting page already in the reading, as ReadingTimer::finish
 * does in a transaction: when the session is refused, the starting page is not kept.
 */
function registerFromStartPage(
    reading: ReadingRow,
    startPage: number,
    register: () => ReadingSessionRow,
): ReadingSessionRow {
    const before = {
        current_page: reading.current_page,
        updated_at: reading.updated_at,
    };

    try {
        if (startPage > reading.current_page) {
            reading.current_page = startPage;
            touch(reading);
        }

        return register();
    } catch (error) {
        Object.assign(reading, before);

        throw error;
    }
}

/** ReadingTimer::finish: logs the session from the starting page to `pageTo`, and discards the timer. */
export function finishTimer(
    state: DemoState,
    pageTo: number,
    clock: TimerClock,
): ReadingSessionRow | null {
    const timer = state.runtime.liveTimer;

    if (timer === null) {
        return null;
    }

    if (pageTo <= timer.start_page) {
        reject(state, 'Informe uma página depois da pág. :page.', {
            page: timer.start_page,
        });
    }

    const minutes = Math.max(
        MINIMUM_MINUTES,
        phpRound(elapsedSeconds(timer, clock.now) / SECONDS_PER_MINUTE),
    );
    const reading = readingForBook(state, timer.book_id);
    const session = registerFromStartPage(reading, timer.start_page, () =>
        registerSession(state, reading.id, pageTo, minutes, clock.today),
    );

    state.runtime.liveTimer = null;

    return session;
}

export function discardTimer(state: DemoState): void {
    state.runtime.liveTimer = null;
}
