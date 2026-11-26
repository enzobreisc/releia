import { addDays } from '../state/dates';
import type { BookRow } from '../state/types';
import { dayOf } from '../support/day';
import { phpRound } from '../support/php-round';
import { currentReadingOf } from './books';
import type { ReadModel } from './read-model';
import { rawSessionPages } from './readings';

const DEFAULT_PAGES_PER_DAY = 20;
const PACE_WINDOW_DAYS = 30;
const PACE_DECIMALS = 1;

type QueuePace = { pages_per_day: number; from_sessions: boolean };

/** QueueService::pace: average pages of the days with reading in the last 30 days. */
export function queuePace(model: ReadModel): QueuePace {
    const from = addDays(model.today, 1 - PACE_WINDOW_DAYS);
    const pagesByDay = new Map<string, number>();

    for (const session of model.state.tables.reading_sessions) {
        const day = dayOf(session.read_on);

        if (day < from || day > model.today) {
            continue;
        }

        pagesByDay.set(
            day,
            (pagesByDay.get(day) ?? 0) + rawSessionPages(session),
        );
    }

    if (pagesByDay.size === 0) {
        return { pages_per_day: DEFAULT_PAGES_PER_DAY, from_sessions: false };
    }

    const totals = [...pagesByDay.values()];
    const average =
        totals.reduce((sum, pages) => sum + pages, 0) / totals.length;

    return {
        pages_per_day: phpRound(average, PACE_DECIMALS),
        from_sessions: true,
    };
}

/** QueueService::estimateDays: null without a page count or a positive pace. */
export function estimateDays(
    model: ReadModel,
    book: BookRow,
    pagesPerDay: number,
): number | null {
    if (book.pages === null || pagesPerDay <= 0) {
        return null;
    }

    const currentPage = currentReadingOf(model, book.id)?.current_page ?? 0;
    const remaining = Math.max(0, book.pages - currentPage);

    return Math.ceil(remaining / pagesPerDay);
}
