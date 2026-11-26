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
import { formRefusable, refusable } from './flash';
import {
    bookIdOf,
    optionalMinutesOf,
    pageNumberOf,
    type PageMessages,
} from './route-input';
import { FormErrors } from '../support/form-errors';

const QUICK_LOG_PATH = '/quick-log';
const TIMER_PATH = '/quick-log/timer';
const MIN_START_PAGE = 0;
const MIN_SESSION_PAGE = 1;
const START_PAGE_MESSAGES: PageMessages = {
    required: 'O campo start page é obrigatório.',
    invalid: 'O campo start page deve estar entre 0 e 20000.',
};
const FINISH_PAGE_MESSAGES: PageMessages = {
    required: 'O campo página é obrigatório.',
    invalid: 'O campo página deve estar entre 1 e 20000.',
};

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
    const errors = new FormErrors(state.runtime.locale);
    const bookId = bookIdOf(state, errors, body.book_id);
    const pageTo = pageNumberOf(
        errors,
        'page_to',
        body.page_to,
        MIN_SESSION_PAGE,
    );
    const minutes = optionalMinutesOf(errors, body.minutes);

    errors.throwIfAny();

    const book = bookRowOf(state, bookId);
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
    const errors = new FormErrors(state.runtime.locale);
    const bookId = bookIdOf(state, errors, body.book_id);
    const startPage = pageNumberOf(
        errors,
        'start_page',
        body.start_page,
        MIN_START_PAGE,
        START_PAGE_MESSAGES,
    );

    errors.throwIfAny();

    startTimer(state, { bookId, startPage }, clockOf(ctx));

    return redirect(QUICK_LOG_PATH);
}

function timerFinishAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const errors = new FormErrors(state.runtime.locale);
    const pageTo = pageNumberOf(
        errors,
        'page_to',
        body.page_to,
        MIN_SESSION_PAGE,
        FINISH_PAGE_MESSAGES,
    );

    errors.throwIfAny();

    const session = finishTimer(state, pageTo, clockOf(ctx));

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
route('POST', QUICK_LOG_PATH, (ctx) => formRefusable(() => storeAction(ctx)));
route('GET', TIMER_PATH, timerStatusAction);
route('POST', TIMER_PATH, (ctx) => formRefusable(() => timerStartAction(ctx)));
route('POST', `${TIMER_PATH}/pause`, pauseAction);
route('POST', `${TIMER_PATH}/resume`, resumeAction);
route('POST', `${TIMER_PATH}/finish`, (ctx) =>
    formRefusable(() => timerFinishAction(ctx)),
);
route('DELETE', TIMER_PATH, discardAction);
route('POST', '/quick-log/books', (ctx) =>
    refusable(() => startBookAction(ctx)),
);
