import type { BookCard, CalendarDay, NamedCount, SpineBook } from '@/types';
import { bookOf } from '../domain/books';
import { heatmap, indicators, streaks } from '../domain/stats';
import { genreCounts } from '../domain/stats-books';
import { defaultYear } from '../domain/stats-year';
import type { ReadModel } from '../domain/read-model';
import {
    type ActivityEvent,
    MAX_PINS,
    pinnedBooks,
    pinnedIds,
    readerDetails,
    type ReaderDetails,
    recentActivity,
} from '../domain/profile-reads';
import {
    firstActivityDay,
    historyPeriod,
    lastDaysPeriod,
    pickYear,
    yearPeriod,
    yearsWithActivity,
} from '../domain/stats-period';
import type { ReadingRow } from '../state/types';
import { compareText } from '../support/collections';
import { LOCALE_NAMES } from '../shell/constants';
import { bookCard, spineBook } from './books';

const AVATAR_DAYS = 25;
const TOP_GENRES = 3;
const MONTH_KEY_LENGTH = 7;

/**
 * The export was recorded with a Google Books key in the environment and none saved. The
 * demo has no key form, so the page shows that same setup.
 */
const GOOGLE_BOOKS_KEY_STATE = {
    saved_ending: null,
    has_environment_key: true,
};

type ProfileProps = {
    reader: ReaderDetails;
    locales: { value: string; label: string }[];
    google_books_key: {
        saved_ending: string | null;
        has_environment_key: boolean;
    };
    since: string;
    totals: {
        books_read: number;
        pages_read: number;
        pages_per_day: number | null;
        streak: number;
        longest_streak: number;
    };
    genres: NamedCount[];
    avatar: number[];
    pinned: (BookCard & { genre: string | null })[];
    pin_options: { id: number; title: string }[];
    pin_limit: number;
    year_books: SpineBook[];
    year: number;
    years: number[];
    calendar: CalendarDay[];
    year_summary: { reading_days: number; longest_streak: number };
    activity: ActivityEvent[];
};

function localeOptions(): { value: string; label: string }[] {
    return Object.entries(LOCALE_NAMES).map(([value, label]) => ({
        value,
        label,
    }));
}

function asciiLowercase(text: string): string {
    return text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());
}

/** Books that can still be pinned, by title ignoring ASCII case (SQLite NOCASE). */
function pinOptions(model: ReadModel): { id: number; title: string }[] {
    const pinned = new Set(pinnedIds(model));

    return model.state.tables.books
        .filter((book) => !pinned.has(book.id))
        .sort(
            (left, right) =>
                compareText(
                    asciiLowercase(left.title),
                    asciiLowercase(right.title),
                ) || left.id - right.id,
        )
        .map(({ id, title }) => ({ id, title }));
}

/**
 * The finish date is compared as stored, as the app's BETWEEN does: "2026-12-31 00:00:00"
 * sorts after "2026-12-31", so a book finished on the last day of the year is left out.
 */
function isFinishedInYear(reading: ReadingRow, year: number): boolean {
    return (
        reading.status === 'read' &&
        reading.finished_at !== null &&
        reading.finished_at >= `${year}-01-01` &&
        reading.finished_at <= `${year}-12-31`
    );
}

/** One spine per book finished in the year, earliest finish first. */
function yearBooks(model: ReadModel, year: number): SpineBook[] {
    const finishes = model.state.tables.readings
        .filter((reading) => isFinishedInYear(reading, year))
        .sort(
            (left, right) =>
                compareText(left.finished_at ?? '', right.finished_at ?? '') ||
                left.id - right.id,
        );
    const firstFinishByBook = new Map<number, ReadingRow>();

    for (const reading of finishes) {
        if (!firstFinishByBook.has(reading.book_id)) {
            firstFinishByBook.set(reading.book_id, reading);
        }
    }

    return [...firstFinishByBook.keys()].map((bookId) =>
        spineBook(model, bookOf(model, bookId)),
    );
}

export function profileProps(
    model: ReadModel,
    requestedYear: string | null,
): ProfileProps {
    const history = historyPeriod(firstActivityDay(model), model.today);
    const years = yearsWithActivity(model);
    const year = pickYear(requestedYear, years, defaultYear(model));
    const calendarYear = yearPeriod(year, model.today);
    const historyTotals = indicators(model, history);
    const historyStreaks = streaks(model, history);
    const yearTotals = indicators(model, calendarYear);

    return {
        reader: readerDetails(model),
        locales: localeOptions(),
        google_books_key: GOOGLE_BOOKS_KEY_STATE,
        since: history.start.slice(0, MONTH_KEY_LENGTH),
        totals: {
            books_read: historyTotals.books_read,
            pages_read: historyTotals.pages_read,
            pages_per_day: historyTotals.pages_per_day,
            streak: historyStreaks.current,
            longest_streak: historyStreaks.longest,
        },
        genres: genreCounts(model, history, TOP_GENRES),
        avatar: heatmap(model, lastDaysPeriod(AVATAR_DAYS, model.today)).map(
            (day) => day.level,
        ),
        pinned: pinnedBooks(model).map((book) => ({
            ...bookCard(model, book),
            genre: book.genre,
        })),
        pin_options: pinOptions(model),
        pin_limit: MAX_PINS,
        year_books: yearBooks(model, year),
        year,
        years,
        calendar: heatmap(model, calendarYear),
        year_summary: {
            reading_days: yearTotals.reading_days,
            longest_streak: streaks(model, calendarYear).longest,
        },
        activity: recentActivity(model),
    };
}
