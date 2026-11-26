import type { BookDetail, ReadingHistory, ReadingSession } from '@/types';
import type { NoteCard } from '@/types/notes';
import type { BookRow, NoteKind, ReadingStatus } from '../state/types';
import { compareText } from '../support/collections';
import { genreNames } from '../support/genres';
import { noteKindLabel, readingStatusLabel } from '../support/labels';
import { isInQueue, readingsOfBook, currentReadingOf } from '../domain/books';
import {
    readingProgress,
    type ReadingProgressValues,
} from '../domain/progress';
import type { ReadModel } from '../domain/read-model';
import { rawSessionPages, sessionsOf } from '../domain/readings';
import { bookDetail } from './books';
import { noteCard } from './notes';
import { readingHistory } from './reading';
import { slugOf } from '../support/slug';

type SelectOption<T extends string> = { value: T; label: string };

type BookRemoval = {
    readings: number;
    finished: number;
    sessions: number;
    pages: number;
    notes: number;
};

type BookPageProps = {
    book: BookDetail;
    slug: string;
    statuses: SelectOption<ReadingStatus>[];
    progress: ReadingProgressValues | null;
    sessions: ReadingSession[];
    can_log: boolean;
    readings: ReadingHistory[];
    notes: NoteCard[];
    note_kinds: SelectOption<NoteKind>[];
    queued: boolean;
    queue_position: number | null;
    removal: BookRemoval;
    max_logged_page: number;
    genres: string[];
};

const READING_STATUSES: readonly ReadingStatus[] = [
    'want_to_read',
    'reading',
    'read',
    'abandoned',
];
const NOTE_KINDS: readonly NoteKind[] = ['excerpt', 'reflection', 'quote'];
const LOGGABLE_STATUSES: readonly ReadingStatus[] = ['want_to_read', 'reading'];

function notesOfBook(model: ReadModel, bookId: number) {
    return model.state.tables.notes
        .filter((note) => note.book_id === bookId)
        .sort(
            (left, right) =>
                compareText(right.updated_at, left.updated_at) ||
                left.id - right.id,
        );
}

function queuePositionOf(model: ReadModel, bookId: number): number | null {
    return (
        model.queueItems.find((item) => item.book_id === bookId)?.position ??
        null
    );
}

function removalOf(model: ReadModel, bookId: number): BookRemoval {
    const readings = readingsOfBook(model, bookId);
    const sessions = readings.flatMap((reading) =>
        sessionsOf(model, reading.id),
    );

    return {
        readings: readings.length,
        finished: readings.filter((reading) => reading.status === 'read')
            .length,
        sessions: sessions.length,
        pages: sessions.reduce(
            (sum, session) => sum + Math.max(0, rawSessionPages(session)),
            0,
        ),
        notes: notesOfBook(model, bookId).length,
    };
}

/** The highest page any session of the book reached; 0 without sessions. */
function maxLoggedPageOf(model: ReadModel, bookId: number): number {
    const pages = readingsOfBook(model, bookId).flatMap((reading) =>
        sessionsOf(model, reading.id).map((session) => session.page_to),
    );

    return pages.length === 0 ? 0 : Math.max(...pages);
}

/** Genres the catalog names plus those the books already use, each once, in code point order. */
function genresOf(model: ReadModel): string[] {
    const bookGenres = model.state.tables.books
        .map((book) => book.genre)
        .filter((genre): genre is string => genre !== null);

    return [...new Set([...genreNames(), ...bookGenres])].sort();
}

/** The props of the book page (BookController::show). `lookup` is optional and not sent on load. */
export function bookPageProps(model: ReadModel, book: BookRow): BookPageProps {
    const reading = currentReadingOf(model, book.id);

    return {
        book: bookDetail(model, book),
        slug: slugOf(book.title),
        statuses: READING_STATUSES.map((status) => ({
            value: status,
            label: readingStatusLabel(model.locale, status),
        })),
        progress: reading === null ? null : readingProgress(model, reading),
        sessions:
            reading === null ? [] : readingHistory(model, reading).sessions,
        can_log: reading !== null && LOGGABLE_STATUSES.includes(reading.status),
        readings: readingsOfBook(model, book.id)
            .slice()
            .sort((left, right) => left.id - right.id)
            .map((row) => readingHistory(model, row)),
        notes: notesOfBook(model, book.id).map((note) => noteCard(model, note)),
        note_kinds: NOTE_KINDS.map((kind) => ({
            value: kind,
            label: noteKindLabel(model.locale, kind),
        })),
        queued: isInQueue(model, book.id),
        queue_position: queuePositionOf(model, book.id),
        removal: removalOf(model, book.id),
        max_logged_page: maxLoggedPageOf(model, book.id),
        genres: genresOf(model),
    };
}
