import { createReadModel } from '../domain/read-model';
import {
    changeReadingStatus,
    finishReading,
    readingForBook,
    registerSession,
} from '../domain/reading-writes';
import { bookRowOf, readingRowOf } from '../domain/rows';
import {
    discardTimer,
    finishTimer,
    pauseTimer,
    resumeTimer,
    startTimer,
    type TimerClock,
} from '../domain/reading-timer';
import type { ReadingSessionRow, DemoState } from '../state/types';
import {
    quickLogPage,
    quickLogSaved,
    quickLogStatus,
} from '../presenters/quick-log';
import {
    json,
    redirect,
    render,
    route,
    type RouteContext,
    type RouteResult,
} from '../server/router';
import { refusable } from './flash';
import { optionalMinutesOf, pageNumberOf } from './route-input';

const QUICK_LOG_PATH = '/quick-log';
const TIMER_PATH = '/quick-log/timer';
const MIN_START_PAGE = 0;
const MIN_SESSION_PAGE = 1;

function clockOf(ctx: RouteContext): TimerClock {
    return { now: new Date(), today: ctx.today };
}

/** The saved summary is flashed to the page that follows the save, which shows it once. */
function showAction(ctx: RouteContext): RouteResult {
    const { state, today } = ctx;
    const saved = state.runtime.quickLogSaved;

    state.runtime.quickLogSaved = null;

    return render(
        'quick-log',
        quickLogPage(createReadModel(state, today, new Date()), saved),
    );
}

/** A session that reaches the book's last page finishes the book, dated today. */
function flashSaved(
    state: DemoState,
    session: ReadingSessionRow,
    today: string,
): void {
    const reading = readingRowOf(state, session.reading_id);
    const { pages } = bookRowOf(state, reading.book_id);
    const finished = pages !== null && session.page_to >= pages;

    if (finished) {
        finishReading(state, reading.id, today, {
            finishedOn: today,
            rating: null,
            line: null,
        });
    }

    state.runtime.quickLogSaved = quickLogSaved(
        createReadModel(state, today, new Date()),
        session,
        finished,
    );
}

function storeAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const book = bookRowOf(state, Number(body.book_id));
    const pageTo = pageNumberOf(state, body.page_to, MIN_SESSION_PAGE);
    const minutes = optionalMinutesOf(state, body.minutes);
    const session = registerSession(
        state,
        readingForBook(state, book.id).id,
        pageTo,
        minutes,
        today,
    );

    flashSaved(state, session, today);

    return redirect(QUICK_LOG_PATH);
}

function startBookAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const book = bookRowOf(state, Number(body.book_id));

    changeReadingStatus(
        state,
        readingForBook(state, book.id).id,
        'reading',
        today,
    );

    return redirect(QUICK_LOG_PATH);
}

function timerStartAction(ctx: RouteContext): RouteResult {
    const { state, body } = ctx;

    startTimer(
        state,
        {
            bookId: Number(body.book_id),
            startPage: pageNumberOf(state, body.start_page, MIN_START_PAGE),
        },
        clockOf(ctx),
    );

    return redirect(QUICK_LOG_PATH);
}

function timerFinishAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const session = finishTimer(
        state,
        pageNumberOf(state, body.page_to, MIN_SESSION_PAGE),
        clockOf(ctx),
    );

    if (session !== null) {
        flashSaved(state, session, today);
    }

    return redirect(QUICK_LOG_PATH);
}

function timerStatusAction(ctx: RouteContext): RouteResult {
    const { state, today } = ctx;

    return json(quickLogStatus(createReadModel(state, today, new Date())));
}

function pauseAction(ctx: RouteContext): RouteResult {
    pauseTimer(ctx.state, new Date());

    return redirect(QUICK_LOG_PATH);
}

function resumeAction(ctx: RouteContext): RouteResult {
    resumeTimer(ctx.state, new Date());

    return redirect(QUICK_LOG_PATH);
}

function discardAction(ctx: RouteContext): RouteResult {
    discardTimer(ctx.state);

    return redirect(QUICK_LOG_PATH);
}

route('GET', QUICK_LOG_PATH, showAction);
route('POST', QUICK_LOG_PATH, (ctx) => refusable(() => storeAction(ctx)));
route('GET', TIMER_PATH, timerStatusAction);
route('POST', TIMER_PATH, (ctx) => refusable(() => timerStartAction(ctx)));
route('POST', `${TIMER_PATH}/pause`, pauseAction);
route('POST', `${TIMER_PATH}/resume`, resumeAction);
route('POST', `${TIMER_PATH}/finish`, (ctx) =>
    refusable(() => timerFinishAction(ctx)),
);
route('DELETE', TIMER_PATH, discardAction);
route('POST', '/quick-log/books', (ctx) =>
    refusable(() => startBookAction(ctx)),
);
