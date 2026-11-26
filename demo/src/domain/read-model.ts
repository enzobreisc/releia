import type { Locale } from '@/lib/i18n';
import { groupBy, indexBy } from '../support/collections';
import type {
    AuthorBookRow,
    AuthorRow,
    BookRow,
    DemoState,
    DemoTables,
    QueueItemRow,
    ReadingRow,
    ReadingSessionRow,
    TagRow,
} from '../state/types';

/**
 * Everything a request reads, indexed once so lookups are not repeated scans.
 * Built per request from the state; the state itself stays the source of truth.
 */
export type ReadModel = {
    readonly state: DemoState;
    readonly locale: Locale;
    /** The visitor's calendar day, as "YYYY-MM-DD". */
    readonly today: string;
    readonly now: Date;
    readonly bookById: ReadonlyMap<number, BookRow>;
    readonly authorsByBook: ReadonlyMap<number, AuthorRow[]>;
    readonly readingById: ReadonlyMap<number, ReadingRow>;
    readonly readingsByBook: ReadonlyMap<number, ReadingRow[]>;
    readonly currentReadingByBook: ReadonlyMap<number, ReadingRow>;
    readonly sessionsByReading: ReadonlyMap<number, ReadingSessionRow[]>;
    readonly tagNamesByNote: ReadonlyMap<number, string[]>;
    readonly queueItems: readonly QueueItemRow[];
    readonly queuedBookIds: ReadonlySet<number>;
};

function byPositionThenId(
    left: { position: number; id: number },
    right: { position: number; id: number },
): number {
    return left.position - right.position || left.id - right.id;
}

/** Authors in pivot position order, as Book::authors() orders them. */
function buildAuthorsByBook(tables: DemoTables): Map<number, AuthorRow[]> {
    const authorById = indexBy(tables.authors, (author) => author.id);
    const links = [...tables.author_book].sort(
        (left: AuthorBookRow, right: AuthorBookRow) =>
            left.position - right.position,
    );
    const authorsByBook = new Map<number, AuthorRow[]>();

    for (const link of links) {
        const author = authorById.get(link.author_id);

        if (author === undefined) {
            continue;
        }

        const authors = authorsByBook.get(link.book_id) ?? [];
        authors.push(author);
        authorsByBook.set(link.book_id, authors);
    }

    return authorsByBook;
}

/** Book::currentReading: the reading with the highest id for each book. */
function buildCurrentReadings(
    readings: readonly ReadingRow[],
): Map<number, ReadingRow> {
    const current = new Map<number, ReadingRow>();

    for (const reading of readings) {
        const previous = current.get(reading.book_id);

        if (previous === undefined || reading.id > previous.id) {
            current.set(reading.book_id, reading);
        }
    }

    return current;
}

function buildTagNamesByNote(tables: DemoTables): Map<number, string[]> {
    const tagById = indexBy<TagRow, number>(tables.tags, (tag) => tag.id);
    const namesByNote = new Map<number, string[]>();

    for (const link of tables.note_tag) {
        const tag = tagById.get(link.tag_id);

        if (tag === undefined) {
            continue;
        }

        const names = namesByNote.get(link.note_id) ?? [];
        names.push(tag.name);
        namesByNote.set(link.note_id, names);
    }

    return namesByNote;
}

export function createReadModel(
    state: DemoState,
    today: string,
    now: Date,
): ReadModel {
    const { tables } = state;

    return {
        state,
        locale: state.runtime.locale,
        today,
        now,
        bookById: indexBy(tables.books, (book) => book.id),
        authorsByBook: buildAuthorsByBook(tables),
        readingById: indexBy(tables.readings, (reading) => reading.id),
        readingsByBook: groupBy(tables.readings, (reading) => reading.book_id),
        currentReadingByBook: buildCurrentReadings(tables.readings),
        sessionsByReading: groupBy(
            tables.reading_sessions,
            (session) => session.reading_id,
        ),
        tagNamesByNote: buildTagNamesByNote(tables),
        queueItems: [...tables.queue_items].sort(byPositionThenId),
        queuedBookIds: new Set(tables.queue_items.map((item) => item.book_id)),
    };
}
