import type { DemoState, TableName } from '../state/types';

type Row = Record<string, unknown>;

/** Removes rows by id and, as the foreign keys do, the rows that depend on them. */
export function removeRows(
    state: DemoState,
    table: TableName,
    ids: ReadonlySet<number>,
): void {
    switch (table) {
        case 'books':
            removeBooks(state, ids);

            return;
        case 'readings':
            removeReadings(state, ids);

            return;
        case 'notes':
            removeNotes(state, ids);

            return;
        default:
            dropRowsById(state, table, ids);
    }
}

function dropRowsById(
    state: DemoState,
    table: TableName,
    ids: ReadonlySet<number>,
): void {
    const tables: Record<TableName, Row[]> = state.tables;

    tables[table] = tables[table].filter((row) => !ids.has(Number(row.id)));
}

function removeReadings(state: DemoState, ids: ReadonlySet<number>): void {
    const { tables } = state;

    tables.reading_sessions = tables.reading_sessions.filter(
        (session) => !ids.has(session.reading_id),
    );
    tables.readings = tables.readings.filter((reading) => !ids.has(reading.id));
}

function removeNotes(state: DemoState, ids: ReadonlySet<number>): void {
    const { tables } = state;

    tables.note_tag = tables.note_tag.filter((link) => !ids.has(link.note_id));
    tables.notes = tables.notes.filter((note) => !ids.has(note.id));
}

function removeBooks(state: DemoState, ids: ReadonlySet<number>): void {
    const { tables } = state;

    removeReadings(
        state,
        idsOf(tables.readings.filter((reading) => ids.has(reading.book_id))),
    );
    removeNotes(
        state,
        idsOf(tables.notes.filter((note) => ids.has(note.book_id))),
    );
    tables.author_book = tables.author_book.filter(
        (link) => !ids.has(link.book_id),
    );
    tables.queue_items = tables.queue_items.filter(
        (item) => !ids.has(item.book_id),
    );
    tables.book_embeddings = tables.book_embeddings.filter(
        (embedding) => !ids.has(embedding.book_id),
    );
    tables.recommendations = tables.recommendations.filter(
        (recommendation) =>
            recommendation.based_on_book_id === null ||
            !ids.has(recommendation.based_on_book_id),
    );
    tables.shopping_items = tables.shopping_items.map((item) =>
        item.book_id !== null && ids.has(item.book_id)
            ? { ...item, book_id: null }
            : item,
    );
    tables.books = tables.books.filter((book) => !ids.has(book.id));
}

function idsOf(rows: readonly { id: number }[]): ReadonlySet<number> {
    return new Set(rows.map((row) => row.id));
}
