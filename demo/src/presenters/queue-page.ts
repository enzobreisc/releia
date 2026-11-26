import type { Pace, QueueCandidate, QueueEntry } from '@/types/queue';
import { addDays } from '../state/dates';
import { bookOf, currentReadingOf, isInQueue } from '../domain/books';
import { queuePace, estimateDays } from '../domain/forecast';
import type { ReadModel } from '../domain/read-model';
import { compareText } from '../support/collections';
import { queueCandidate, queueEntry } from './queue';

type QueuePageProps = {
    queue: QueueEntry[];
    pace: Pace;
    available: QueueCandidate[];
    shopping_pending: number;
};

const CANDIDATE_STATUSES: readonly string[] = ['want_to_read', 'read'];

/**
 * QueuePresenter::index: each book's days and finish date, counted in queue order.
 * Once one book has no page count, the dates after it are unknown too.
 */
function scheduledEntries(
    model: ReadModel,
    pagesPerDay: number,
): {
    entries: QueueEntry[];
    queueDays: number | null;
} {
    let elapsed: number | null = 0;
    const entries: QueueEntry[] = [];

    for (const item of model.queueItems) {
        const days = estimateDays(
            model,
            bookOf(model, item.book_id),
            pagesPerDay,
        );

        elapsed = days === null || elapsed === null ? null : elapsed + days;
        entries.push(
            queueEntry(model, item, {
                estimated_days: days,
                finishes_on:
                    elapsed === null ? null : addDays(model.today, elapsed),
            }),
        );
    }

    return { entries, queueDays: elapsed };
}

/** Books on a reading status that can join the queue, not yet in it, by title. */
function queueCandidates(model: ReadModel): QueueCandidate[] {
    return model.state.tables.books
        .filter((book) => !isInQueue(model, book.id))
        .filter((book) => {
            const status = currentReadingOf(model, book.id)?.status;

            return status !== undefined && CANDIDATE_STATUSES.includes(status);
        })
        .sort((left, right) => compareText(left.title, right.title))
        .map((book) => queueCandidate(model, book));
}

export function queuePageProps(
    model: ReadModel,
    shoppingPending: number,
): QueuePageProps {
    const pace = queuePace(model);
    const { entries, queueDays } = scheduledEntries(model, pace.pages_per_day);

    return {
        queue: entries,
        pace: { ...pace, queue_days: queueDays },
        available: queueCandidates(model),
        shopping_pending: shoppingPending,
    };
}
