import type { NamedCount, ReadingRef } from '@/types';
import { bookOf } from '../domain/books';
import { indicators, streaks } from '../domain/stats';
import { defaultYear } from '../domain/stats-year';
import type { ReadModel } from '../domain/read-model';
import {
    authorCounts,
    fastestReading,
    genreCounts,
    longestReading,
    rereadsIn,
    topRated,
} from '../domain/stats-books';
import {
    pickYear,
    type StatsPeriod,
    yearPeriod,
    yearsWithActivity,
} from '../domain/stats-period';
import { compareText } from '../support/collections';
import { bestMonthCount, optionalReadingRef, readingRef } from './stats';

const TOP_LIMIT = 5;

type WrappedProps = {
    year: number;
    years: number[];
    summary: { books_read: number; pages_read: number };
    genre: NamedCount | null;
    author: NamedCount | null;
    fastest: ReadingRef | null;
    longest: ReadingRef | null;
    best_month: NamedCount | null;
    streak: number;
    top: ReadingRef[];
    rereads: string[];
};

/** Titles of the rereads, in the order they were finished. */
function rereadTitles(model: ReadModel, period: StatsPeriod): string[] {
    return rereadsIn(model, period)
        .sort(
            (left, right) =>
                compareText(left.finished_at, right.finished_at) ||
                left.id - right.id,
        )
        .map((reading) => bookOf(model, reading.book_id).title);
}

export function wrappedProps(
    model: ReadModel,
    requested: string | null,
): WrappedProps {
    const years = yearsWithActivity(model);
    const year = pickYear(requested, years, defaultYear(model));
    const period = yearPeriod(year, model.today);
    const totals = indicators(model, period);

    return {
        year,
        years,
        summary: {
            books_read: totals.books_read,
            pages_read: totals.pages_read,
        },
        genre: genreCounts(model, period, 1).at(0) ?? null,
        author: authorCounts(model, period, 1).at(0) ?? null,
        fastest: optionalReadingRef(model, fastestReading(model, period)),
        longest: optionalReadingRef(model, longestReading(model, period)),
        best_month: bestMonthCount(model, period),
        streak: streaks(model, period).longest,
        top: topRated(model, period, TOP_LIMIT).map((reading) =>
            readingRef(model, reading),
        ),
        rereads: rereadTitles(model, period),
    };
}
