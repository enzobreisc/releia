import type { DemoState, NoteKind, NoteRow } from '../state/types';
import { bookRowOf, noteRowOf } from '../domain/rows';
import {
    checkNoteInput,
    createNote,
    deleteNote,
    updateNote,
    type NoteInput,
} from '../domain/note-writes';
import { captureUndo, rememberUndo, undoScope } from '../domain/undo';
import { phpTrim } from '../support/php-cast';
import { enumOf, optionalInteger, requiredText } from '../support/form-input';
import { FormErrors } from '../support/form-errors';
import {
    backWith,
    formRefusable,
    refusable,
    successNotice,
    translateFor,
} from './flash';
import { route, type RouteContext, type RouteResult } from '../server/router';

const NOTE_KINDS: readonly NoteKind[] = ['excerpt', 'reflection', 'quote'];

/** NoteRequest: a blank page is no page, and the text is trimmed as every input is. */
function noteInputOf(
    state: DemoState,
    body: Record<string, unknown>,
    errors: FormErrors,
): NoteInput {
    const kind = enumOf(body.kind, NOTE_KINDS);
    const bookId = optionalInteger(body.book_id);

    if (bookId === null) {
        errors.add('book_id', 'Escolha o livro.');
    }

    if (kind === null) {
        errors.add(
            'kind',
            requiredText(body.kind) === ''
                ? 'O campo tipo é obrigatório.'
                : 'O valor escolhido para tipo é inválido.',
        );
    }

    return {
        bookId: bookId ?? 0,
        page: optionalInteger(body.page),
        kind: kind ?? NOTE_KINDS[0],
        body: phpTrim(requiredText(body.body_md)),
    };
}

/** Parses and checks a note request; every failing rule is reported together. */
function validNoteInput(
    state: DemoState,
    body: Record<string, unknown>,
): NoteInput {
    const errors = new FormErrors(state.runtime.locale);
    const input = noteInputOf(state, body, errors);

    checkNoteInput(state, input, errors);
    errors.throwIfAny();

    return input;
}

/** The place a note belongs to, as the notices name it: "Title · p. 13". */
function whereOf(state: DemoState, note: NoteRow): string {
    const title = bookRowOf(state, note.book_id).title;

    return note.page === null
        ? title
        : `${title} · ${translateFor(state, 'p. :page', { page: note.page })}`;
}

function storeAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    const note = createNote(state, validNoteInput(state, ctx.body));

    return backWith(
        successNotice(translateFor(state, 'Nota criada'), whereOf(state, note)),
    );
}

function updateAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    updateNote(state, Number(ctx.params.note), validNoteInput(state, ctx.body));

    return backWith(successNotice(translateFor(state, 'Nota salva')));
}

function destroyAction(ctx: RouteContext): RouteResult {
    const { state } = ctx;
    const noteId = Number(ctx.params.note);
    const where = whereOf(state, noteRowOf(state, noteId));
    const snapshot = captureUndo(state, [
        undoScope('notes', { id: noteId }),
        undoScope('note_tag', { note_id: noteId }, null),
    ]);

    deleteNote(state, noteId);

    return backWith(
        successNotice(translateFor(state, 'Nota excluída'), where, {
            undo: rememberUndo(snapshot),
        }),
    );
}

route('POST', '/notes', (ctx) => formRefusable(() => storeAction(ctx)));
route('PATCH', '/notes/{note}', (ctx) =>
    formRefusable(() => updateAction(ctx)),
);
route('DELETE', '/notes/{note}', (ctx) => refusable(() => destroyAction(ctx)));
