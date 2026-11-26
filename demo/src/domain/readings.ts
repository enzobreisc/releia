import type { ReadingRow, ReadingSessionRow } from '../state/types';
import { dayOf } from '../support/day';
import { readingsOfBook } from './books';
import type { ReadModel } from './read-model';

/** Reading.findOrFail: a reading that is referenced must exist. */
export function readingOf(model: ReadModel, readingId: number): ReadingRow {
    const reading = model.readingById.get(readingId);

    if (reading === undefined) {
        throw new Error(`Reading ${readingId} is not in the demo state.`);
    }

    return reading;
}

export function sessionsOf(
    model: ReadModel,
    readingId: number,
): ReadingSessionRow[] {
    return model.sessionsByReading.get(readingId) ?? [];
}

/** ReadingService::ordinal: 1 for the first reading of a book, 2 for its reread, and so on. */
export function readingOrdinal(model: ReadModel, reading: ReadingRow): number {
    return readingsOfBook(model, reading.book_id).filter(
        (other) => other.id <= reading.id,
    ).length;
}

/** Unclamped, as the SQL sums of the progress queries count them. */
export function rawSessionPages(session: ReadingSessionRow): number {
    return session.page_to - session.page_from + 1;
}

export function uniqueDays(sessions: readonly ReadingSessionRow[]): string[] {
    return [...new Set(sessions.map((session) => dayOf(session.read_on)))];
}
