import type { SidebarReading } from '@/types';
import type {
    LiveTimerState,
    QuickLogSaved,
    ReadingSessionRow,
} from '../state/types';
import { lastWeekLevels, streak } from '../domain/activity';
import { bookOf, currentReadingOf } from '../domain/books';
import { readingsInProgress } from '../domain/dashboard';
import { nextInQueue } from '../domain/queue';
import type { ReadModel } from '../domain/read-model';
import { readingSpanDays } from '../domain/progress';
import { readingOf } from '../domain/readings';
import { elapsedSeconds } from '../domain/reading-timer';
import { readSetting } from '../domain/settings';
import { appIsoTimestamp } from '../support/app-time';
import { compareAsciiNoCase } from '../support/collections';
import { readingSession, readingSummary, sidebarReading } from './reading';

const DEFAULT_SHORTCUT = 'CmdOrCtrl+Shift+L';
const SHORTCUT_SETTING = 'quick_log_shortcut';
const MILLISECONDS_PER_SECOND = 1000;

type QuickLogTimer = {
    book_id: number;
    start_page: number;
    elapsed: number;
    paused: boolean;
};

type QuickLogStatus =
    | { state: 'idle'; reading: SidebarReading | null }
    | {
          state: 'reading' | 'paused';
          title: string;
          start_page: number;
          elapsed: number;
          counting_since: string;
      };

/** QuickLog::shortcut: the setting when one is stored, the default otherwise. */
function shortcutOf(model: ReadModel): string {
    const key = readSetting(model, SHORTCUT_SETTING);

    return typeof key === 'string' && key !== '' ? key : DEFAULT_SHORTCUT;
}

/** The books whose current reading is still "want to read", by title. */
function availableBooks(model: ReadModel): { id: number; title: string }[] {
    return model.state.tables.books
        .filter(
            (book) =>
                currentReadingOf(model, book.id)?.status === 'want_to_read',
        )
        .sort(
            (left, right) =>
                compareAsciiNoCase(left.title, right.title) ||
                left.id - right.id,
        )
        .map(({ id, title }) => ({ id, title }));
}

function quickLogTimer(
    timer: LiveTimerState | null,
    now: Date,
): QuickLogTimer | null {
    if (timer === null) {
        return null;
    }

    return {
        book_id: timer.book_id,
        start_page: timer.start_page,
        elapsed: elapsedSeconds(timer, now),
        paused: timer.paused_at !== null,
    };
}

/** DashboardService::sidebarCard: the first reading in progress, with the week map. */
function sidebarCard(model: ReadModel): SidebarReading | null {
    const [reading] = readingsInProgress(model);

    return reading === undefined ? null : sidebarReading(model, reading);
}

export function quickLogPage(model: ReadModel, saved: QuickLogSaved | null) {
    return {
        readings: readingsInProgress(model).map((reading) =>
            readingSummary(model, reading),
        ),
        available: availableBooks(model),
        timer: quickLogTimer(model.state.runtime.liveTimer, model.now),
        week: lastWeekLevels(model),
        streak: streak(model),
        shortcut: shortcutOf(model),
        saved,
    };
}

/** The timer as the phone's lock screen widget reads it. */
export function quickLogStatus(model: ReadModel): QuickLogStatus {
    const timer = model.state.runtime.liveTimer;

    if (timer === null) {
        return { state: 'idle', reading: sidebarCard(model) };
    }

    const elapsed = elapsedSeconds(timer, model.now);
    const countingSince = new Date(
        model.now.getTime() - elapsed * MILLISECONDS_PER_SECOND,
    );

    return {
        state: timer.paused_at === null ? 'reading' : 'paused',
        title: bookOf(model, timer.book_id).title,
        start_page: timer.start_page,
        elapsed,
        counting_since: appIsoTimestamp(countingSince),
    };
}

/** QuickLogController::flashSaved: the summary of the session, with the next book when the book is finished. */
export function quickLogSaved(
    model: ReadModel,
    session: ReadingSessionRow,
    finished: boolean,
): QuickLogSaved {
    const reading = readingOf(model, session.reading_id);
    const book = bookOf(model, reading.book_id);
    const next = finished ? nextInQueue(model) : null;
    const nextBook = next === null ? null : bookOf(model, next.book_id);

    return {
        ...readingSession(session),
        title: book.title,
        book_id: book.id,
        streak: streak(model),
        finished,
        days: finished ? readingSpanDays(reading) : null,
        next:
            nextBook === null
                ? null
                : { id: nextBook.id, title: nextBook.title },
    };
}
