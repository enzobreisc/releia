import type { Toast } from '@/types';
import { createReadModel } from '../domain/read-model';
import { finishReading, readingForBook } from '../domain/reading-writes';
import {
    discardTimer,
    finishTimer,
    moveTimerPage,
    pauseTimer,
    resumeTimer,
    startTimer,
    type TimerClock,
} from '../domain/reading-timer';
import { bookRowOf } from '../domain/rows';
import type { DemoState, ReadingSessionRow } from '../state/types';
import { liveSessionPage } from '../presenters/live-session';
import { readingSession } from '../presenters/reading';
import { flagOf } from '../support/form-input';
import {
    redirect,
    redirectBack,
    render,
    route,
    errorToast,
    type RouteContext,
    type RouteResult,
} from '../server/router';
import { backWith, refusable, successNotice, translateFor } from './flash';
import { pageNumberOf } from './route-input';

const LIVE_SESSION_PATH = '/live-session';
const HOME_PATH = '/';
const BOOK_PATH_PREFIX = '/library';
const MIN_LIVE_PAGE = 0;

function clockOf(ctx: RouteContext): TimerClock {
    return { now: new Date(), today: ctx.today };
}

function showAction(ctx: RouteContext): RouteResult {
    const { state, today } = ctx;
    const timer = state.runtime.liveTimer;

    if (timer === null) {
        return redirect(HOME_PATH);
    }

    const reading = readingForBook(state, timer.book_id);
    const model = createReadModel(state, today, new Date());

    return render('live-session', liveSessionPage(model, timer, reading));
}

/** A second book cannot start while a session runs; the notice links back to the running one. */
function otherBookNotice(state: DemoState): Toast {
    return {
        ...errorToast(
            translateFor(
                state,
                'Já existe uma sessão em andamento em outro livro',
            ),
            translateFor(state, 'Termine ou descarte a sessão atual primeiro.'),
        ),
        action: {
            label: translateFor(state, 'Abrir sessão'),
            method: 'get',
            url: LIVE_SESSION_PATH,
        },
    };
}

function startAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    const bookId = Number(ctx.params.book);
    const timer = state.runtime.liveTimer;

    if (timer !== null && timer.book_id !== bookId) {
        return backWith(otherBookNotice(state));
    }

    if (timer === null) {
        startTimer(
            state,
            {
                bookId,
                startPage: readingForBook(state, bookId).current_page,
            },
            clockOf(ctx),
        );
    }

    return redirect(LIVE_SESSION_PATH);
}

function movePageAction(ctx: RouteContext): RouteResult {
    const { state, body } = ctx;

    moveTimerPage(state, pageNumberOf(state, body.page, MIN_LIVE_PAGE));

    return redirectBack();
}

function sessionNotice(
    state: DemoState,
    session: ReadingSessionRow,
    finishedTitle: string | null,
): Toast {
    const summary = readingSession(session);
    const title =
        finishedTitle === null
            ? translateFor(state, 'Sessão registrada')
            : translateFor(state, ':title marcado como lido', {
                  title: finishedTitle,
              });
    const pages = translateFor(state, 'p. :page', {
        page: `${session.page_from} → ${session.page_to}`,
    });
    const added = translateFor(state, '+:pages págs', {
        pages: summary.pages,
    });

    return successNotice(title, `${summary.hash} · ${pages} · ${added}`);
}

function finishAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const timer = state.runtime.liveTimer;

    if (timer === null) {
        return redirect(HOME_PATH);
    }

    const session = finishTimer(state, timer.page, clockOf(ctx));

    if (session === null) {
        return redirect(HOME_PATH);
    }

    const book = bookRowOf(state, timer.book_id);
    const finishBook =
        flagOf(body.finish_book) &&
        book.pages !== null &&
        session.page_to >= book.pages;

    if (finishBook) {
        finishReading(state, session.reading_id, today, {
            finishedOn: today,
            rating: null,
            line: null,
        });
    }

    return redirect(`${BOOK_PATH_PREFIX}/${book.id}`, {
        toast: sessionNotice(state, session, finishBook ? book.title : null),
    });
}

function discardAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    const timer = state.runtime.liveTimer;

    if (timer === null) {
        return redirect(HOME_PATH);
    }

    discardTimer(state);

    return redirect(`${BOOK_PATH_PREFIX}/${timer.book_id}`, {
        toast: successNotice(translateFor(state, 'Sessão descartada')),
    });
}

route('GET', LIVE_SESSION_PATH, showAction);
route('POST', '/library/{book}/live-session', (ctx) =>
    refusable(() => startAction(ctx)),
);
route('PATCH', '/live-session/page', (ctx) =>
    refusable(() => movePageAction(ctx)),
);
route('POST', '/live-session/pause', (ctx) => {
    pauseTimer(ctx.state, new Date());

    return redirectBack();
});
route('POST', '/live-session/resume', (ctx) => {
    resumeTimer(ctx.state, new Date());

    return redirectBack();
});
route('POST', '/live-session/finish', (ctx) =>
    refusable(() => finishAction(ctx)),
);
route('DELETE', LIVE_SESSION_PATH, discardAction);
