import type {
    BookRow,
    DemoState,
    NoteRow,
    ReadingRow,
    ReadingSessionRow,
} from '../state/types';

/** The row a reference points to. A reference that is missing is a bug in the demo's data. */
function rowWithId<T extends { id: number }>(
    rows: readonly T[],
    table: string,
    id: number,
): T {
    const row = rows.find((candidate) => candidate.id === id);

    if (row === undefined) {
        throw new Error(`${table} ${id} is not in the demo state.`);
    }

    return row;
}

export function bookRowOf(state: DemoState, bookId: number): BookRow {
    return rowWithId(state.tables.books, 'Book', bookId);
}

export function readingRowOf(state: DemoState, readingId: number): ReadingRow {
    return rowWithId(state.tables.readings, 'Reading', readingId);
}

export function sessionRowOf(
    state: DemoState,
    sessionId: number,
): ReadingSessionRow {
    return rowWithId(state.tables.reading_sessions, 'Session', sessionId);
}

export function noteRowOf(state: DemoState, noteId: number): NoteRow {
    return rowWithId(state.tables.notes, 'Note', noteId);
}
