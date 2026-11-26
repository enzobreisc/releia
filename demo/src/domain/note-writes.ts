import type { DemoState, NoteKind, NoteRow, NoteTagRow } from '../state/types';
import { removeRows } from './cascade';
import { FormErrors } from '../support/form-errors';
import { nextRowId } from './queue-writes';
import { localDateTime } from '../state/dates';

/**
 * A tag is "#" followed by a letter, not right after another letter, digit,
 * "/" or "&" (so URL anchors and "a#b" are not tags).
 */
const TAG_PATTERN = /(?<![\p{L}\p{N}_&/#])#(\p{L}[\p{L}\p{N}_-]{0,39})/gu;
const COMBINING_MARKS = /\p{M}/gu;
const MAX_PAGE = 100_000;

export type NoteInput = {
    bookId: number;
    page: number | null;
    kind: NoteKind;
    body: string;
};

/** Note::extractTags: the "#tags" of the text, lower case and without accents. */
function extractTags(body: string): string[] {
    const names = [...body.matchAll(TAG_PATTERN)].map((match) =>
        (match[1] ?? '')
            .normalize('NFD')
            .replace(COMBINING_MARKS, '')
            .toLowerCase(),
    );

    return [...new Set(names)];
}

function tagIdFor(state: DemoState, name: string): number {
    const existing = state.tables.tags.find((tag) => tag.name === name);

    if (existing !== undefined) {
        return existing.id;
    }

    const stamp = localDateTime(new Date());
    const tag = {
        id: nextRowId(state.tables.tags),
        name,
        created_at: stamp,
        updated_at: stamp,
    };

    state.tables.tags.push(tag);

    return tag.id;
}

/** NoteService::syncTags: the note's tags are the "#" words of its text. */
function syncTags(state: DemoState, noteId: number, body: string): void {
    const links: NoteTagRow[] = extractTags(body).map((name) => ({
        note_id: noteId,
        tag_id: tagIdFor(state, name),
    }));

    state.tables.note_tag = [
        ...state.tables.note_tag.filter((link) => link.note_id !== noteId),
        ...links,
    ];
}

/** NoteRequest: the checks that need the library, such as the book that must exist. */
export function checkNoteInput(
    state: DemoState,
    input: NoteInput,
    errors: FormErrors,
): void {
    if (!state.tables.books.some((book) => book.id === input.bookId)) {
        errors.add('book_id', 'Livro não encontrado.');
    }

    if (input.body === '') {
        errors.add('body_md', 'Escreva o texto da nota.');
    }

    if (input.page !== null && (input.page < 1 || input.page > MAX_PAGE)) {
        errors.add('page', 'Número de página inválido.');
    }
}

export function createNote(state: DemoState, input: NoteInput): NoteRow {
    const stamp = localDateTime(new Date());
    const note: NoteRow = {
        id: nextRowId(state.tables.notes),
        book_id: input.bookId,
        page: input.page,
        kind: input.kind,
        body_md: input.body,
        created_at: stamp,
        updated_at: stamp,
    };

    state.tables.notes.push(note);
    syncTags(state, note.id, input.body);

    return note;
}

/** Eloquent saves only changed columns, so the timestamp moves only when something did. */
export function updateNote(
    state: DemoState,
    noteId: number,
    input: NoteInput,
): NoteRow {
    const note = state.tables.notes.find((row) => row.id === noteId);

    if (note === undefined) {
        throw new Error(`Note ${noteId} is not in the demo state.`);
    }

    const changed =
        note.book_id !== input.bookId ||
        note.page !== input.page ||
        note.kind !== input.kind ||
        note.body_md !== input.body;

    note.book_id = input.bookId;
    note.page = input.page;
    note.kind = input.kind;
    note.body_md = input.body;

    if (changed) {
        note.updated_at = localDateTime(new Date());
    }

    syncTags(state, note.id, input.body);

    return note;
}

export function deleteNote(state: DemoState, noteId: number): void {
    removeRows(state, 'notes', new Set([noteId]));
}
