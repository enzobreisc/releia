import type {
    ReadingHistory,
    ReadingSession,
    ReadingSummary,
    SidebarReading,
} from '@/types';
import type { ReadingRow, ReadingSessionRow } from '../state/types';
import { bookOf, authorNamesOf, bookCoverUrl } from '../domain/books';
import { lastWeekLevels, streak } from '../domain/activity';
import { readingProgress, readingSpanDays } from '../domain/progress';
import type { ReadModel } from '../domain/read-model';
import {
    rawSessionPages,
    readingOrdinal,
    sessionsOf,
} from '../domain/readings';
import { compareText } from '../support/collections';
import { dayOf, nullableDayOf } from '../support/day';
import { phpRound } from '../support/php-round';
import { sha1Hex } from '../support/sha1';
import { readingStatusLabel } from '../support/labels';

const HASH_LENGTH = 7;
const PACE_DECIMALS = 1;

function newestFirst(
    left: ReadingSessionRow,
    right: ReadingSessionRow,
): number {
    return (
        compareText(dayOf(right.read_on), dayOf(left.read_on)) ||
        right.id - left.id
    );
}

/** The hash is a display label derived from the id, styled like a commit hash. */
export function readingSession(session: ReadingSessionRow): ReadingSession {
    return {
        id: session.id,
        hash: sha1Hex(String(session.id)).slice(0, HASH_LENGTH),
        read_on: dayOf(session.read_on),
        page_from: session.page_from,
        page_to: session.page_to,
        pages: Math.max(0, rawSessionPages(session)),
        minutes: session.minutes,
    };
}

/** ReadingPresenter::summary: the reading's book and its progress. */
export function readingSummary(
    model: ReadModel,
    reading: ReadingRow,
): ReadingSummary {
    const book = bookOf(model, reading.book_id);

    return {
        reading_id: reading.id,
        book_id: book.id,
        title: book.title,
        authors: authorNamesOf(model, book.id),
        cover_url: bookCoverUrl(book),
        ...readingProgress(model, reading),
    };
}

/** The sidebar card: the summary plus the week map and the streak. */
export function sidebarReading(
    model: ReadModel,
    reading: ReadingRow,
): SidebarReading {
    return {
        ...readingSummary(model, reading),
        week: lastWeekLevels(model),
        streak: streak(model),
    };
}

/** ReadingPresenter::history: one reading of a book, with its sessions newest first. */
export function readingHistory(
    model: ReadModel,
    reading: ReadingRow,
): ReadingHistory {
    const book = bookOf(model, reading.book_id);
    const sessions = [...sessionsOf(model, reading.id)].sort(newestFirst);
    const days = readingSpanDays(reading);
    const pages = reading.status === 'read' ? book.pages : reading.current_page;
    const earliest = sessions[sessions.length - 1];
    const latest = sessions[0];

    return {
        id: reading.id,
        number: readingOrdinal(model, reading),
        status: reading.status,
        status_label: readingStatusLabel(model.locale, reading.status),
        started_at: nullableDayOf(reading.started_at),
        finished_at: nullableDayOf(reading.finished_at),
        days,
        current_page: reading.current_page,
        pages_per_day:
            days !== null && pages
                ? phpRound(pages / days, PACE_DECIMALS)
                : null,
        rating: reading.rating,
        review: reading.review,
        abandon_reason: reading.abandon_reason,
        sessions_count: sessions.length,
        first_session_on:
            earliest === undefined ? null : dayOf(earliest.read_on),
        last_session_on: latest === undefined ? null : dayOf(latest.read_on),
        sessions: sessions.map(readingSession),
    };
}
