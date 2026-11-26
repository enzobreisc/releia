import { readingSession } from '../presenters/reading';
import { captureUndo, rememberUndo, undoScope } from '../domain/undo';
import {
    deleteSession,
    readingForBook,
    registerSession,
    updateSession,
    WriteRejected,
} from '../domain/reading-writes';
import { sessionRowOf } from '../domain/rows';
import { optionalText, optionalInteger } from '../support/form-input';
import { route, type RouteContext, type RouteResult } from '../server/router';
import { backWith, refusable, successNotice, translateFor } from './flash';
import type { DemoState } from '../state/types';

const MIN_PAGE = 1;
const MAX_PAGE = 20_000;
const MIN_MINUTES = 1;
const MAX_MINUTES = 1440;

function pageRangeOf(state: DemoState, value: unknown): number {
    const page = optionalInteger(value);

    if (page === null) {
        throw new WriteRejected(translateFor(state, 'Informe a página atual.'));
    }

    if (page < MIN_PAGE || page > MAX_PAGE) {
        throw new WriteRejected(
            translateFor(state, 'Número de página inválido.'),
        );
    }

    return page;
}

/** Minutes are optional; a value outside the range is refused, as the form request does. */
function minutesOf(state: DemoState, value: unknown): number | null {
    const minutes = optionalInteger(value);

    if (minutes === null) {
        return null;
    }

    if (minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
        throw new WriteRejected(
            translateFor(state, 'Informe entre 1 e 1440 minutos.'),
        );
    }

    return minutes;
}

function pagesSub(
    state: DemoState,
    hash: string,
    from: number,
    to: number,
): string {
    return `${hash} · ${translateFor(state, 'p. :page', { page: `${from} → ${to}` })}`;
}

function storeAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const pageTo = pageRangeOf(state, body.page_to);
    const minutes = minutesOf(state, body.minutes);
    const reading = readingForBook(state, Number(ctx.params.book));
    const session = registerSession(state, reading.id, pageTo, minutes, today);
    const data = readingSession(session);

    return backWith(
        successNotice(
            translateFor(state, 'Sessão registrada'),
            `${pagesSub(state, data.hash, session.page_from, session.page_to)} · ${translateFor(state, '+:pages págs', { pages: data.pages })}`,
        ),
    );
}

function updateAction(ctx: RouteContext): RouteResult {
    const { state, body } = ctx;
    const sessionId = Number(ctx.params.session);
    const readOn = optionalText(body.read_on);

    if (readOn === null) {
        throw new WriteRejected(translateFor(state, 'Informe a data.'));
    }

    const session = updateSession(
        state,
        sessionId,
        readOn,
        pageRangeOf(state, body.page_to),
        minutesOf(state, body.minutes),
    );

    return backWith(
        successNotice(
            translateFor(state, 'Sessão corrigida'),
            readingSession(session).hash,
        ),
    );
}

function destroyAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    const sessionId = Number(ctx.params.session);
    const session = sessionRowOf(state, sessionId);
    const data = readingSession(session);
    const snapshot = captureUndo(state, [
        undoScope('reading_sessions', { id: sessionId }),
        undoScope('readings', { id: session.reading_id }),
    ]);

    deleteSession(state, sessionId);

    return backWith(
        successNotice(
            translateFor(state, 'Sessão apagada'),
            `${pagesSub(state, data.hash, session.page_from, session.page_to)} · ${translateFor(state, 'progresso recalculado')}`,
            { undo: rememberUndo(snapshot) },
        ),
    );
}

route('POST', '/library/{book}/sessions', (ctx) =>
    refusable(() => storeAction(ctx)),
);
route('PATCH', '/sessions/{session}', (ctx) =>
    refusable(() => updateAction(ctx)),
);
route('DELETE', '/sessions/{session}', (ctx) =>
    refusable(() => destroyAction(ctx)),
);
