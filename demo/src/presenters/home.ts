import type {
    HomeLiveSession,
    NextInQueue,
    ReadingSummary,
    RecentBook,
    Suggestion,
} from '@/types';
import type { QueueItemRow, RecommendationRow } from '../state/types';
import {
    averagePagesPerReadingDay,
    lastWeekLevels,
    pagesOn,
    streak,
} from '../domain/activity';
import { authorNamesOf, bookCoverUrl, bookOf } from '../domain/books';
import {
    dailyGoal,
    recentlyFinished,
    readingsInProgress,
    type YearGoalValues,
    yearGoal,
} from '../domain/dashboard';
import { readerName } from '../domain/profile';
import type { ReadModel } from '../domain/read-model';
import { readingSpanDays } from '../domain/progress';
import { nextInQueue, queueTotal } from '../domain/queue';
import { nullableDayOf } from '../support/day';
import { bookCard } from './books';
import { liveSessionSummary } from './live-session';
import { readingSummary } from './reading';
import { recommendationCard } from './recommendation';

type HomeProps = {
    reader_name: string | null;
    reading: ReadingSummary[];
    goal: YearGoalValues;
    today: {
        pages: number;
        average: number | null;
        goal: number | null;
        week: number[];
        streak: number;
    };
    live_session: HomeLiveSession | null;
    next_in_queue: NextInQueue | null;
    recent: RecentBook[];
    suggestion: Suggestion | null;
};

function nextInQueueCard(
    model: ReadModel,
    item: QueueItemRow | null,
): NextInQueue | null {
    if (item === null) {
        return null;
    }

    const book = bookOf(model, item.book_id);

    return {
        book_id: book.id,
        title: book.title,
        authors: authorNamesOf(model, book.id),
        cover_url: bookCoverUrl(book),
        pages: book.pages,
        position: item.position,
        total: queueTotal(model),
    };
}

export function homeProps(
    model: ReadModel,
    suggestion: RecommendationRow | null,
): HomeProps {
    return {
        reader_name: readerName(model),
        reading: readingsInProgress(model).map((reading) =>
            readingSummary(model, reading),
        ),
        goal: yearGoal(model),
        today: {
            pages: pagesOn(model, model.today),
            average: averagePagesPerReadingDay(model),
            goal: dailyGoal(model),
            week: lastWeekLevels(model),
            streak: streak(model),
        },
        live_session: liveSessionSummary(model),
        next_in_queue: nextInQueueCard(model, nextInQueue(model)),
        recent: recentlyFinished(model).map(({ reading, book }) => ({
            ...bookCard(model, book),
            finished_at: nullableDayOf(reading.finished_at),
            days: readingSpanDays(reading),
        })),
        suggestion:
            suggestion === null ? null : recommendationCard(model, suggestion),
    };
}
