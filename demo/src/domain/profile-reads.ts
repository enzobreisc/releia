import type { BookRow, ReadingRow } from '../state/types';
import { compareText } from '../support/collections';
import { dayOf } from '../support/day';
import { intValue } from '../support/php-cast';
import { bookOf, readingsOfBook } from './books';
import { readerName } from './profile';
import type { ReadModel } from './read-model';
import { readingOf } from './readings';
import { readSetting } from './settings';
import { sessionPagesOf } from './stats-sessions';

export const PINS_SETTING = 'pinned_books';
export const READER_SETTING = 'reader';
export const MAX_PINS = 6;

const ACTIVITY_LIMIT = 8;

export type ReaderDetails = { name: string | null; bio: string | null };

export type ActivityEvent =
    | {
          type: 'finished';
          book_id: number;
          title: string;
          date: string;
          rating: number | null;
      }
    | {
          type: 'session';
          book_id: number;
          title: string;
          date: string;
          pages: number;
      }
    | {
          type: 'added' | 'reread';
          book_id: number;
          title: string;
          date: string;
      };

/** ProfileService::reader: name and bio, each null until saved. */
export function readerDetails(model: ReadModel): ReaderDetails {
    const stored = readSetting(model, READER_SETTING);
    const bio =
        typeof stored === 'object' && stored !== null
            ? (stored as Record<string, unknown>).bio
            : null;

    return {
        name: readerName(model),
        bio: typeof bio === 'string' ? bio : null,
    };
}

/** Pinned ids in pin order; ids of books that no longer exist are dropped. */
export function pinnedIds(model: ReadModel): number[] {
    const stored = readSetting(model, PINS_SETTING);

    if (!Array.isArray(stored)) {
        return [];
    }

    return (stored as unknown[])
        .map(intValue)
        .filter((id) => model.bookById.has(id));
}

export function pinnedBooks(model: ReadModel): BookRow[] {
    return pinnedIds(model).map((id) => bookOf(model, id));
}

function finishedEvents(model: ReadModel): ActivityEvent[] {
    return model.state.tables.readings
        .filter(
            (reading): reading is ReadingRow & { finished_at: string } =>
                reading.status === 'read' && reading.finished_at !== null,
        )
        .sort(
            (left, right) =>
                compareText(right.finished_at, left.finished_at) ||
                right.id - left.id,
        )
        .slice(0, ACTIVITY_LIMIT)
        .map((reading): ActivityEvent => {
            const book = bookOf(model, reading.book_id);

            return {
                type: 'finished',
                book_id: book.id,
                title: book.title,
                date: dayOf(reading.finished_at),
                rating: reading.rating,
            };
        });
}

function sessionEvents(model: ReadModel): ActivityEvent[] {
    return [...model.state.tables.reading_sessions]
        .sort(
            (left, right) =>
                compareText(right.read_on, left.read_on) || right.id - left.id,
        )
        .slice(0, ACTIVITY_LIMIT)
        .map((session): ActivityEvent => {
            const book = bookOf(
                model,
                readingOf(model, session.reading_id).book_id,
            );

            return {
                type: 'session',
                book_id: book.id,
                title: book.title,
                date: dayOf(session.read_on),
                pages: sessionPagesOf(session),
            };
        });
}

/** The first reading of a book is "added"; the readings after it are rereads. */
function addedEvents(model: ReadModel): ActivityEvent[] {
    return [...model.state.tables.readings]
        .sort(
            (left, right) =>
                compareText(right.created_at, left.created_at) ||
                right.id - left.id,
        )
        .slice(0, ACTIVITY_LIMIT)
        .map((reading): ActivityEvent => {
            const book = bookOf(model, reading.book_id);
            const firstId = Math.min(
                ...readingsOfBook(model, reading.book_id).map(
                    (other) => other.id,
                ),
            );

            return {
                type: firstId === reading.id ? 'added' : 'reread',
                book_id: book.id,
                title: book.title,
                date: dayOf(reading.created_at),
            };
        });
}

/**
 * The latest finished readings, sessions and added books, newest day first. Each kind is
 * cut to the limit before the three lists are merged, as ProfileService does.
 */
export function recentActivity(model: ReadModel): ActivityEvent[] {
    return [
        ...finishedEvents(model),
        ...sessionEvents(model),
        ...addedEvents(model),
    ]
        .sort((left, right) => compareText(right.date, left.date))
        .slice(0, ACTIVITY_LIMIT);
}
