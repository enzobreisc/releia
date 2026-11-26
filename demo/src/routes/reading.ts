import { monthYear, ordinal, shortDate } from '@/lib/i18n';
import type { Toast, ToastAction } from '@/types';
import { createReadModel } from '../domain/read-model';
import { yearGoal } from '../domain/dashboard';
import { nextInQueue } from '../domain/queue';
import { bookOf } from '../domain/books';
import {
    captureUndo,
    rememberUndo,
    undoScope,
    type UndoSnapshot,
} from '../domain/undo';
import {
    abandonReading,
    changeReadingStatus,
    deleteReading,
    finishReading,
    latestReadingOf,
    ordinalOfReading,
    readingForBook,
    reopenReading,
    startReread,
    updateReadingDates,
    updateReadingNotes,
} from '../domain/reading-writes';
import { bookRowOf, readingRowOf } from '../domain/rows';
import { dayOf, yearOf } from '../support/day';
import {
    FormErrors,
    checkDayFormat,
    checkMaxLength,
    rejectField,
} from '../support/form-errors';
import {
    enumOf,
    flagOf,
    optionalInteger,
    optionalText,
} from '../support/form-input';
import type { DemoState, ReadingRow, ReadingStatus } from '../state/types';
import {
    route,
    redirect,
    redirectBack,
    type RedirectResult,
    type RouteContext,
    type RouteResult,
} from '../server/router';
import {
    backWith,
    formRefusable,
    refusable,
    successNotice,
    translateFor,
} from './flash';

const READING_STATUSES: readonly ReadingStatus[] = [
    'want_to_read',
    'reading',
    'read',
    'abandoned',
];
const REREAD_STATUSES: readonly ReadingStatus[] = ['reading', 'want_to_read'];
const QUEUE_PATH = '/queue';
const QUEUE_STORE_PATH = '/queue/books';
const BOOK_PATH_PREFIX = '/library';
const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_LINE_LENGTH = 280;

type StatusNotice = {
    state: DemoState;
    today: string;
    bookId: number;
    reading: ReadingRow;
    before: ReadingStatus | null;
    wasQueued: boolean;
    undo: string;
};

function bookIdOf(ctx: RouteContext): number {
    return Number(ctx.params.book);
}

function readingIdOf(ctx: RouteContext): number {
    return Number(ctx.params.reading);
}

function titleOf(state: DemoState, bookId: number): string {
    return bookRowOf(state, bookId).title;
}

function isQueued(state: DemoState, bookId: number): boolean {
    return state.tables.queue_items.some((item) => item.book_id === bookId);
}

function queuePositionOf(state: DemoState, bookId: number): number {
    return (
        state.tables.queue_items.find((item) => item.book_id === bookId)
            ?.position ?? 0
    );
}

/** The snapshot of a shelf change: the book's readings (a reread adds one) and the whole queue. */
function captureShelf(state: DemoState, bookId: number): UndoSnapshot {
    return captureUndo(state, [
        undoScope('readings', { book_id: bookId }),
        undoScope('queue_items'),
    ]);
}

function ordinalLabel(state: DemoState, reading: ReadingRow): string {
    return translateFor(state, ':ordinal leitura', {
        ordinal: ordinal(
            state.runtime.locale,
            ordinalOfReading(state, reading),
            'feminine',
        ),
    });
}

function keptPageNote(state: DemoState, page: number): string | null {
    return page <= 0
        ? null
        : translateFor(
              state,
              'a p. :page fica guardada; ao voltar, continua dela',
              { page },
          );
}

function rereadNotice(
    state: DemoState,
    reading: ReadingRow,
    undo: string,
): Toast {
    if (reading.status === 'reading') {
        return successNotice(
            translateFor(state, ':ordinal leitura começou', {
                ordinal: ordinal(
                    state.runtime.locale,
                    ordinalOfReading(state, reading),
                    'feminine',
                ),
            }),
            translateFor(state, 'a anterior está na aba Leituras'),
            { undo },
        );
    }

    return successNotice(
        translateFor(state, 'Quero reler'),
        translateFor(
            state,
            'nova leitura · entrou em :position na fila · a anterior continua no histórico',
            {
                position: ordinal(
                    state.runtime.locale,
                    queuePositionOf(state, reading.book_id),
                    'masculine',
                ),
            },
        ),
        { undo },
    );
}

/** ReadingController::statusToast: the notice that names the shelf the book went to. */
function statusNotice(change: StatusNotice): Toast {
    const { state, today, bookId, reading, before, wasQueued, undo } = change;

    if (before === 'read') {
        return rereadNotice(state, reading, undo);
    }

    switch (reading.status) {
        case 'reading':
            return before === 'abandoned'
                ? successNotice(
                      translateFor(state, 'Leitura retomada'),
                      translateFor(state, 'continua da p. :page', {
                          page: reading.current_page,
                      }),
                      { undo },
                  )
                : successNotice(
                      translateFor(state, 'Começou a ler'),
                      startedSub(state, reading, today, wasQueued),
                      { undo },
                  );
        case 'want_to_read':
            return successNotice(
                translateFor(state, 'Movido para Quero ler'),
                keptPageNote(state, reading.current_page),
                {
                    action: isQueued(state, bookId)
                        ? null
                        : queueAction(state, bookId),
                    undo,
                },
            );
        case 'read':
            return successNotice(
                translateFor(state, ':title marcado como lido', {
                    title: titleOf(state, bookId),
                }),
                null,
                { undo },
            );
        case 'abandoned':
            return successNotice(
                translateFor(state, 'Abandonado na p. :page', {
                    page: reading.current_page,
                }),
                null,
                { undo },
            );
    }
}

function startedSub(
    state: DemoState,
    reading: ReadingRow,
    today: string,
    wasQueued: boolean,
): string {
    const startedOn = dayOf(reading.started_at ?? today);
    const started = translateFor(state, 'início: :date', {
        date: shortDate(state.runtime.locale, startedOn),
    });

    return wasQueued
        ? `${translateFor(state, 'saiu da fila')} · ${started}`
        : started;
}

function queueAction(state: DemoState, bookId: number): ToastAction {
    return {
        label: translateFor(state, 'Pôr na fila'),
        method: 'post',
        url: QUEUE_STORE_PATH,
        data: { book_id: bookId },
    };
}

/** Changes the shelf of the book's current reading, or of a new one. */
function shelfAction(
    ctx: RouteContext,
    bookId: number,
    requested: ReadingStatus | null,
): RedirectResult {
    const { state, today } = ctx;
    const beforeStatus = latestReadingOf(state, bookId)?.status ?? null;
    const snapshot = captureShelf(state, bookId);
    const wasQueued = isQueued(state, bookId);
    const current = readingForBook(state, bookId);
    const reading = changeReadingStatus(
        state,
        current.id,
        requested ?? current.status,
        today,
    );
    const undo = rememberUndo(snapshot);

    return backWith(
        statusNotice({
            state,
            today,
            bookId,
            reading,
            before: beforeStatus,
            wasQueued,
            undo,
        }),
    );
}

function updateNotesAction(ctx: RouteContext, bookId: number): RedirectResult {
    const { state, body } = ctx;
    const reading = readingForBook(state, bookId);
    const changes: { rating?: number | null; review?: string | null } = {};

    if ('rating' in body) {
        changes.rating = optionalInteger(body.rating) || null;
    }

    if ('review' in body) {
        changes.review = optionalText(body.review);
    }

    updateReadingNotes(state, reading.id, changes);

    if (!('review' in body)) {
        return redirectBack();
    }

    return backWith(
        successNotice(
            translateFor(state, 'Resenha salva'),
            ordinalLabel(state, reading),
        ),
    );
}

function updateAction(ctx: RouteContext): RouteResult {
    const bookId = bookIdOf(ctx);
    const requested = enumOf(ctx.body.status, READING_STATUSES);

    if (!('status' in ctx.body)) {
        return updateNotesAction(ctx, bookId);
    }

    return shelfAction(ctx, bookId, requested);
}

function startAction(ctx: RouteContext): RouteResult {
    const { state, today } = ctx;
    const bookId = bookIdOf(ctx);
    const snapshot = captureShelf(state, bookId);
    const wasQueued = isQueued(state, bookId);
    const current = readingForBook(state, bookId);
    const reading = changeReadingStatus(state, current.id, 'reading', today);
    const undo = rememberUndo(snapshot);
    const toast = statusNotice({
        state,
        today,
        bookId,
        reading,
        before: current.status,
        wasQueued,
        undo,
    });

    return redirect(`${BOOK_PATH_PREFIX}/${bookId}`, { toast });
}

function rereadAction(ctx: RouteContext): RouteResult {
    const { state, today } = ctx;
    const bookId = bookIdOf(ctx);
    const status = enumOf(ctx.body.status, REREAD_STATUSES);

    if (status === null) {
        rejectField(
            state.runtime.locale,
            'status',
            'Uma releitura começa em "lendo" ou "quero ler".',
        );
    }

    const snapshot = captureShelf(state, bookId);
    const reading = startReread(state, bookId, status, today);
    const undo = rememberUndo(snapshot);

    return backWith(rereadNotice(state, reading, undo));
}

function finishGoalSub(
    state: DemoState,
    finished: ReadingRow,
    today: string,
    nextTitle: string | null,
): string {
    const model = createReadModel(state, today, new Date());
    const goal = yearGoal(model);
    const finishedYear =
        finished.finished_at === null
            ? null
            : yearOf(dayOf(finished.finished_at));

    if (
        goal.goal !== null &&
        goal.finished === goal.goal &&
        finishedYear === goal.year
    ) {
        return translateFor(state, 'Meta de :year batida: :finished de :goal', {
            year: goal.year,
            finished: goal.finished,
            goal: goal.goal,
        });
    }

    if (nextTitle !== null) {
        return translateFor(state, 'próximo da fila: :title', {
            title: nextTitle,
        });
    }

    return translateFor(state, 'a fila está vazia');
}

function finishErrorsOf(
    state: DemoState,
    body: RouteContext['body'],
): FormErrors {
    const errors = new FormErrors(state.runtime.locale);
    const undated = flagOf(body.undated);
    const finishedOn = optionalText(body.finished_on);
    const rating = optionalInteger(body.rating);

    if (!undated && finishedOn === null) {
        errors.add(
            'finished_on',
            'O campo término é obrigatório quando undated não está presente.',
        );
    }

    checkDayFormat(
        errors,
        'finished_on',
        finishedOn,
        'O campo término deve estar no formato :format.',
    );

    if (rating !== null && (rating < MIN_RATING || rating > MAX_RATING)) {
        errors.add('rating', 'O campo nota deve estar entre 1 e 5.');
    }

    checkMaxLength(
        errors,
        'line',
        optionalText(body.line),
        MAX_LINE_LENGTH,
        'O campo linha deve ter no máximo :max caracteres.',
    );

    return errors;
}

function finishAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const readingId = readingIdOf(ctx);
    const undated = flagOf(body.undated);
    const finishedOn = optionalText(body.finished_on);

    finishErrorsOf(state, body).throwIfAny();

    const bookId = readingRowOf(state, readingId).book_id;
    const snapshot = captureShelf(state, bookId);
    const finished = finishReading(state, readingId, today, {
        finishedOn: undated ? null : finishedOn,
        rating: optionalInteger(body.rating),
        line: optionalText(body.line),
    });
    const model = createReadModel(state, today, new Date());
    const next = nextInQueue(model);
    const nextBook = next === null ? null : bookOf(model, next.book_id);
    const action: ToastAction =
        nextBook === null
            ? {
                  label: translateFor(state, 'Escolher o próximo'),
                  method: 'get',
                  url: QUEUE_PATH,
              }
            : {
                  label: translateFor(state, 'Começar :title', {
                      title: nextBook.title,
                  }),
                  method: 'post',
                  url: `${BOOK_PATH_PREFIX}/${nextBook.id}/start`,
              };

    return backWith(
        successNotice(
            translateFor(state, ':title marcado como lido', {
                title: titleOf(state, bookId),
            }),
            finishGoalSub(state, finished, today, nextBook?.title ?? null),
            { action, undo: rememberUndo(snapshot) },
        ),
    );
}

function abandonAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const readingId = readingIdOf(ctx);
    const bookId = readingRowOf(state, readingId).book_id;
    const snapshot = captureShelf(state, bookId);
    const reading = abandonReading(
        state,
        readingId,
        today,
        optionalText(body.reason),
        optionalInteger(body.rating),
    );
    const reasonSub =
        reading.abandon_reason === null
            ? translateFor(state, 'sem motivo')
            : translateFor(state, 'motivo: :reason', {
                  reason: reading.abandon_reason,
              });

    return backWith(
        successNotice(
            translateFor(state, 'Abandonado na p. :page', {
                page: reading.current_page,
            }),
            reasonSub,
            { undo: rememberUndo(snapshot) },
        ),
    );
}

function reopenAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    const readingId = readingIdOf(ctx);
    const snapshot = captureShelf(
        state,
        readingRowOf(state, readingId).book_id,
    );
    const reading = reopenReading(state, readingId);

    return backWith(
        successNotice(
            translateFor(state, 'Desmarcado como lido'),
            translateFor(state, 'a leitura voltou para Lendo na p. :page', {
                page: reading.current_page,
            }),
            { undo: rememberUndo(snapshot) },
        ),
    );
}

function datesErrorsOf(
    state: DemoState,
    body: RouteContext['body'],
): FormErrors {
    const errors = new FormErrors(state.runtime.locale);

    checkDayFormat(
        errors,
        'started_at',
        optionalText(body.started_at),
        'O campo início deve estar no formato :format.',
    );
    checkDayFormat(
        errors,
        'finished_at',
        optionalText(body.finished_at),
        'O campo término deve estar no formato :format.',
    );

    return errors;
}

function datesAction(ctx: RouteContext): RouteResult {
    const { state, today, body } = ctx;
    const readingId = readingIdOf(ctx);

    datesErrorsOf(state, body).throwIfAny();

    const snapshot = captureUndo(state, [
        undoScope('readings', { id: readingId }),
    ]);
    const reading = updateReadingDates(
        state,
        readingId,
        optionalText(body.started_at),
        optionalText(body.finished_at),
        today,
    );
    const month = monthYear(
        state.runtime.locale,
        dayOf(reading.finished_at ?? reading.started_at ?? today),
    );

    return backWith(
        successNotice(
            translateFor(state, 'Datas salvas'),
            translateFor(state, 'estatísticas de :month atualizadas', {
                month,
            }),
            { undo: rememberUndo(snapshot) },
        ),
    );
}

function destroyAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    const readingId = readingIdOf(ctx);
    const reading = readingRowOf(state, readingId);
    const label = ordinalLabel(state, reading);
    const title = titleOf(state, reading.book_id);
    const snapshot = captureUndo(state, [
        undoScope('readings', { book_id: reading.book_id }),
        undoScope('reading_sessions', { reading_id: readingId }),
    ]);

    deleteReading(state, readingId);

    return backWith(
        successNotice(
            translateFor(state, 'Leitura apagada'),
            translateFor(state, ':reading de :title', {
                reading: label,
                title,
            }),
            { undo: rememberUndo(snapshot) },
        ),
    );
}

route('PATCH', '/library/{book}/reading', (ctx) =>
    refusable(() => updateAction(ctx)),
);
route('POST', '/library/{book}/start', (ctx) =>
    refusable(() => startAction(ctx)),
);
route('POST', '/library/{book}/reread', (ctx) =>
    refusable(() => rereadAction(ctx)),
);
route('POST', '/readings/{reading}/finish', (ctx) =>
    formRefusable(() => finishAction(ctx)),
);
route('POST', '/readings/{reading}/abandon', (ctx) =>
    refusable(() => abandonAction(ctx)),
);
route('POST', '/readings/{reading}/reopen', (ctx) =>
    refusable(() => reopenAction(ctx)),
);
route('PATCH', '/readings/{reading}/dates', (ctx) =>
    formRefusable(() => datesAction(ctx)),
);
route('DELETE', '/readings/{reading}', (ctx) =>
    refusable(() => destroyAction(ctx)),
);
