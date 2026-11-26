import { readingSession } from '../presenters/reading';
import { captureUndo, rememberUndo, undoScope } from '../domain/undo';
import {
    deleteSession,
    readingForBook,
    registerSession,
    updateSession,
} from '../domain/reading-writes';
import { sessionRowOf } from '../domain/rows';
import { requiredText } from '../support/form-input';
import { FormErrors, checkDayFormat } from '../support/form-errors';
import { route, type RouteContext, type RouteResult } from '../server/router';
import type { DemoState } from '../state/types';
import {
    formRefusable,
    refusable,
    backWith,
    successNotice,
    translateFor,
} from './flash';
import {
    optionalMinutesOf,
    pageNumberOf,
    type PageMessages,
} from './route-input';

const MIN_PAGE = 1;
const UPDATE_PAGE_MESSAGES: PageMessages = {
    required: 'Informe a página.',
    invalid: 'Número de página inválido.',
};

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
    const errors = new FormErrors(state.runtime.locale);
    const pageTo = pageNumberOf(errors, 'page_to', body.page_to, MIN_PAGE);
    const minutes = optionalMinutesOf(errors, body.minutes);

    errors.throwIfAny();

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
    const errors = new FormErrors(state.runtime.locale);
    const readOn = requiredText(body.read_on);

    if (readOn === '') {
        errors.add('read_on', 'Informe a data.');
    }

    checkDayFormat(
        errors,
        'read_on',
        readOn,
        'O campo read on deve estar no formato :format.',
    );

    const pageTo = pageNumberOf(
        errors,
        'page_to',
        body.page_to,
        MIN_PAGE,
        UPDATE_PAGE_MESSAGES,
    );
    const minutes = optionalMinutesOf(errors, body.minutes);

    errors.throwIfAny();

    const session = updateSession(state, sessionId, readOn, pageTo, minutes);

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
    formRefusable(() => storeAction(ctx)),
);
route('PATCH', '/sessions/{session}', (ctx) =>
    formRefusable(() => updateAction(ctx)),
);
route('DELETE', '/sessions/{session}', (ctx) =>
    refusable(() => destroyAction(ctx)),
);
