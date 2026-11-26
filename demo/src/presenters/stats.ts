import { monthNames } from '@/lib/i18n';
import type {
    CalendarDay,
    Forecast,
    Indicators,
    MonthlyBar,
    NamedCount,
    ReadingRef,
    Streak,
} from '@/types';
import { authorNamesOf, bookCoverUrl, bookOf } from '../domain/books';
import { readingSpanDays } from '../domain/progress';
import { defaultYear } from '../domain/stats-year';
import type { ReadModel } from '../domain/read-model';
import { forecast, heatmap, indicators, streaks } from '../domain/stats';
import {
    authorCounts,
    bestMonth,
    booksPerBucket,
    fastestReading,
    genreCounts,
    longestReading,
} from '../domain/stats-books';
import {
    calendarPeriod,
    firstActivityDay,
    historyPeriod,
    pickYear,
    type StatsPeriod,
    yearPeriod,
    yearsWithActivity,
} from '../domain/stats-period';
import type { ReadingRow } from '../state/types';
import { nullableDayOf } from '../support/day';
import { monthFullName, monthNumberOf } from '../support/months';

const HISTORY_SELECTION = 'all';
const GENRE_LIMIT = 6;
const AUTHOR_LIMIT = 6;

type StatsProps = {
    selected: string;
    years: number[];
    indicators: Indicators;
    monthly: MonthlyBar[];
    genres: NamedCount[];
    authors: NamedCount[];
    extremes: { fastest: ReadingRef | null; longest: ReadingRef | null };
    best_month: NamedCount | null;
    streak: Streak;
    calendar: CalendarDay[];
    forecast: Forecast | null;
};

/** StatsPresenter::reading: one finished reading as a card. */
export function readingRef(model: ReadModel, reading: ReadingRow): ReadingRef {
    const book = bookOf(model, reading.book_id);

    return {
        id: book.id,
        title: book.title,
        authors: authorNamesOf(model, book.id),
        genre: book.genre,
        cover_url: bookCoverUrl(book),
        rating: reading.rating,
        pages: book.pages,
        days: readingSpanDays(reading),
        finished_at: nullableDayOf(reading.finished_at),
    };
}

export function optionalReadingRef(
    model: ReadModel,
    reading: ReadingRow | null,
): ReadingRef | null {
    return reading === null ? null : readingRef(model, reading);
}

/** The month with the most finished books, labelled with its full name. */
export function bestMonthCount(
    model: ReadModel,
    period: StatsPeriod,
): NamedCount | null {
    const best = bestMonth(model, period);

    if (best === null) {
        return null;
    }

    return {
        label: monthFullName(model.locale, monthNumberOf(best.month)),
        count: best.count,
    };
}

function bucketLabel(model: ReadModel, key: string, history: boolean): string {
    if (history) {
        return key;
    }

    return monthNames(model.locale)[monthNumberOf(key) - 1];
}

function monthlyBars(model: ReadModel, period: StatsPeriod): MonthlyBar[] {
    return booksPerBucket(model, period).map((bucket) => ({
        label: bucketLabel(model, bucket.key, period.history),
        count: bucket.count,
    }));
}

function selectedPeriod(
    model: ReadModel,
    history: boolean,
    year: number,
): StatsPeriod {
    return history
        ? historyPeriod(firstActivityDay(model), model.today)
        : yearPeriod(year, model.today);
}

export function statsProps(
    model: ReadModel,
    requested: string | null,
): StatsProps {
    const years = yearsWithActivity(model);
    const history = requested === HISTORY_SELECTION;
    const year = pickYear(requested, years, defaultYear(model));
    const period = selectedPeriod(model, history, year);

    return {
        selected: history ? HISTORY_SELECTION : String(year),
        years,
        indicators: indicators(model, period),
        monthly: monthlyBars(model, period),
        genres: genreCounts(model, period, GENRE_LIMIT),
        authors: authorCounts(model, period, AUTHOR_LIMIT),
        extremes: {
            fastest: optionalReadingRef(model, fastestReading(model, period)),
            longest: optionalReadingRef(model, longestReading(model, period)),
        },
        best_month: bestMonthCount(model, period),
        streak: streaks(model, period),
        calendar: heatmap(model, calendarPeriod(period, model.today)),
        forecast: forecast(model, period),
    };
}
