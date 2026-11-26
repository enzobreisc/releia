import { localDateTime } from '../state/dates';
import type { DemoState, QueueItemRow, ReadingRow } from '../state/types';

function byPositionThenId(left: QueueItemRow, right: QueueItemRow): number {
    return left.position - right.position || left.id - right.id;
}

/** The id a new row gets: one more than the largest, as the export's ids are plain integers. */
export function nextRowId(rows: readonly { id: number }[]): number {
    return Math.max(0, ...rows.map((row) => row.id)) + 1;
}

function nextQueuePosition(items: readonly QueueItemRow[]): number {
    return Math.max(0, ...items.map((item) => item.position)) + 1;
}

/** Positions become 1..n again, in the order they had, after a removal. */
function compactPositions(state: DemoState): void {
    [...state.tables.queue_items]
        .sort(byPositionThenId)
        .forEach((item, index) => {
            item.position = index + 1;
        });
}

export function findQueueItemOfBook(
    state: DemoState,
    bookId: number,
): QueueItemRow | undefined {
    return state.tables.queue_items.find((item) => item.book_id === bookId);
}

export function isQueueOrder(
    state: DemoState,
    ids: readonly number[],
): boolean {
    const current = state.tables.queue_items
        .map((item) => item.id)
        .sort((left, right) => left - right);
    const requested = [...ids].sort((left, right) => left - right);

    return (
        current.length === requested.length &&
        current.every((id, index) => id === requested[index])
    );
}

/** A book already in the queue does not enter again: the call is idempotent. */
export function addToQueue(state: DemoState, bookId: number, now: Date): void {
    const items = state.tables.queue_items;

    if (findQueueItemOfBook(state, bookId) !== undefined) {
        return;
    }

    items.push({
        id: nextRowId(items),
        book_id: bookId,
        position: nextQueuePosition(items),
        added_at: localDateTime(now),
    });
}

export function removeQueueItem(state: DemoState, queueItemId: number): void {
    state.tables.queue_items = state.tables.queue_items.filter(
        (item) => item.id !== queueItemId,
    );
    compactPositions(state);
}

/** Takes the book out of the queue, if it is in it (when starting to read, for instance). */
export function removeBookFromQueue(state: DemoState, bookId: number): void {
    const item = findQueueItemOfBook(state, bookId);

    if (item !== undefined) {
        removeQueueItem(state, item.id);
    }
}

/** Saves the order given by the ids; the caller checks it with isQueueOrder first. */
export function reorderQueue(state: DemoState, ids: readonly number[]): void {
    for (const [index, id] of ids.entries()) {
        const item = state.tables.queue_items.find(
            (queueItem) => queueItem.id === id,
        );

        if (item !== undefined) {
            item.position = index + 1;
        }
    }
}

/** ReadingService::startReread for "want to read": a new reading of a finished book, which joins the queue. */
export function startRereadWantToRead(
    state: DemoState,
    bookId: number,
    now: Date,
): void {
    const readings = state.tables.readings;
    const stamp = localDateTime(now);
    const reading: ReadingRow = {
        id: nextRowId(readings),
        book_id: bookId,
        status: 'want_to_read',
        started_at: null,
        finished_at: null,
        current_page: 0,
        rating: null,
        review: null,
        abandon_reason: null,
        created_at: stamp,
        updated_at: stamp,
    };

    readings.push(reading);
    addToQueue(state, bookId, now);
}
