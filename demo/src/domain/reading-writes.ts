import { shortDate, translateText, type Replacements } from '@/lib/i18n';
import { dayOf } from '../support/day';
import { phpTrim } from '../support/php-cast';
import type {
    DemoState,
    ReadingRow,
    ReadingSessionRow,
    ReadingStatus,
} from '../state/types';
import { removeRows } from './cascade';
import { bookRowOf, readingRowOf, sessionRowOf } from './rows';
import { addToQueue, nextRowId, removeBookFromQueue } from './queue-writes';
import { localDateTime } from '../state/dates';

const OPEN_STATUSES: readonly ReadingStatus[] = ['want_to_read', 'reading'];
const CLOSED_STATUSES: readonly ReadingStatus[] = ['read', 'abandoned'];
const MIN_READINGS_PER_BOOK = 1;
const ABANDON_READ_MESSAGE =
    'Um livro lido não pode ser abandonado. Para relê-lo, use "Ler de novo".';

/** A write the demo refuses, with the message the app would show. */
export class WriteRejected extends Error {}

type FinishInput = {
    finishedOn: string | null;
    rating: number | null;
    line: string | null;
};

export function reject(
    state: DemoState,
    text: string,
    replacements?: Replacements,
): never {
    throw new WriteRejected(
        translateText(state.runtime.locale, text, replacements),
    );
}

function startOfDay(day: string): string {
    return `${dayOf(day)} 00:00:00`;
}

export function touch(row: { updated_at: string }): void {
    row.updated_at = localDateTime(new Date());
}

function readingsOfBookRows(state: DemoState, bookId: number): ReadingRow[] {
    return state.tables.readings.filter((row) => row.book_id === bookId);
}

function sessionsOfReadingRows(
    state: DemoState,
    readingId: number,
): ReadingSessionRow[] {
    return state.tables.reading_sessions.filter(
        (row) => row.reading_id === readingId,
    );
}

/** Book::currentReading: the reading with the highest id. */
export function latestReadingOf(
    state: DemoState,
    bookId: number,
): ReadingRow | undefined {
    return readingsOfBookRows(state, bookId).reduce<ReadingRow | undefined>(
        (latest, row) =>
            latest === undefined || row.id > latest.id ? row : latest,
        undefined,
    );
}

function insertReading(
    state: DemoState,
    bookId: number,
    status: ReadingStatus,
    startedAt: string | null,
): ReadingRow {
    const stamp = localDateTime(new Date());
    const reading: ReadingRow = {
        id: nextRowId(state.tables.readings),
        book_id: bookId,
        status,
        started_at: startedAt,
        finished_at: null,
        current_page: 0,
        rating: null,
        review: null,
        abandon_reason: null,
        created_at: stamp,
        updated_at: stamp,
    };

    state.tables.readings.push(reading);

    return reading;
}

/** ReadingService::readingFor: the current reading, or a new "want to read" one. */
export function readingForBook(state: DemoState, bookId: number): ReadingRow {
    return (
        latestReadingOf(state, bookId) ??
        insertReading(state, bookId, 'want_to_read', null)
    );
}

/** ReadingService::ordinal: 1 for the first reading of a book, 2 for its reread, and so on. */
export function ordinalOfReading(
    state: DemoState,
    reading: ReadingRow,
): number {
    return readingsOfBookRows(state, reading.book_id).filter(
        (row) => row.id <= reading.id,
    ).length;
}

function applyStatus(
    state: DemoState,
    reading: ReadingRow,
    status: ReadingStatus,
    today: string,
): void {
    reading.status = status;

    switch (status) {
        case 'want_to_read':
            reading.finished_at = null;
            reading.abandon_reason = null;
            return;
        case 'reading':
            reading.started_at ??= startOfDay(today);
            reading.finished_at = null;
            reading.abandon_reason = null;
            return;
        case 'read':
            reading.started_at ??= startOfDay(today);
            reading.finished_at = startOfDay(today);
            reading.current_page = Math.max(
                reading.current_page,
                bookRowOf(state, reading.book_id).pages ?? 0,
            );
            reading.abandon_reason = null;
            return;
        case 'abandoned':
            reading.started_at ??= startOfDay(today);
            reading.finished_at = startOfDay(today);
            return;
    }
}

/**
 * ReadingService::changeStatus. A read book does not change shelf in the same reading:
 * that becomes a reread, which returns the new reading.
 */
export function changeReadingStatus(
    state: DemoState,
    readingId: number,
    status: ReadingStatus,
    today: string,
): ReadingRow {
    const reading = readingRowOf(state, readingId);

    if (reading.status === status) {
        return reading;
    }

    if (reading.status === 'read') {
        if (status === 'abandoned') {
            reject(state, ABANDON_READ_MESSAGE);
        }

        return startReread(state, reading.book_id, status, today);
    }

    applyStatus(state, reading, status, today);
    touch(reading);

    if (status !== 'want_to_read') {
        removeBookFromQueue(state, reading.book_id);
    }

    return reading;
}

/** ReadingService::startReread: a new reading of a book that was read; the old one stays. */
export function startReread(
    state: DemoState,
    bookId: number,
    status: ReadingStatus,
    today: string,
): ReadingRow {
    if (!OPEN_STATUSES.includes(status)) {
        reject(state, 'Uma releitura começa em "lendo" ou "quero ler".');
    }

    if (latestReadingOf(state, bookId)?.status !== 'read') {
        reject(state, 'Só dá para reler um livro que você terminou.');
    }

    const reading = insertReading(
        state,
        bookId,
        status,
        status === 'reading' ? startOfDay(today) : null,
    );

    if (status === 'want_to_read') {
        addToQueue(state, bookId, new Date());
    } else {
        removeBookFromQueue(state, bookId);
    }

    return reading;
}

function sessionDaysOf(state: DemoState, readingId: number): string[] {
    return sessionsOfReadingRows(state, readingId).map((session) =>
        dayOf(session.read_on),
    );
}

/** The start a finish gives a reading that has none: its first session, or the finish day. */
function startedOnFinish(
    firstDay: string | undefined,
    finishedOn: string | null,
): string | null {
    if (firstDay !== undefined) {
        return startOfDay(firstDay);
    }

    return finishedOn === null ? null : startOfDay(finishedOn);
}

/** ReadingService::ensureEndDate: an end date cannot be in the future nor before the reading's data. */
function ensureEndDate(
    state: DemoState,
    reading: ReadingRow,
    end: string,
    field: 'finished_on' | 'finished_at',
    today: string,
): void {
    if (end > today) {
        reject(state, 'O término não pode ser depois de hoje.');
    }

    const startedOn =
        reading.started_at === null ? null : dayOf(reading.started_at);

    if (startedOn !== null && end < startedOn && field === 'finished_on') {
        reject(
            state,
            'A leitura começou em :date. Escolha essa data ou depois.',
            {
                date: shortDate(state.runtime.locale, startedOn),
            },
        );
    }

    const days = sessionDaysOf(state, reading.id);
    const lastSession =
        days.length === 0
            ? null
            : days.reduce((max, day) => (day > max ? day : max));

    if (lastSession !== null && end < lastSession) {
        reject(
            state,
            'A última sessão foi em :date. Escolha essa data ou depois.',
            {
                date: shortDate(state.runtime.locale, lastSession),
            },
        );
    }
}

/** ReadingService::finish: marks the reading read, with an optional rating and a line at the top of the review. */
export function finishReading(
    state: DemoState,
    readingId: number,
    today: string,
    input: FinishInput,
): ReadingRow {
    const reading = readingRowOf(state, readingId);

    if (reading.status === 'read') {
        reject(state, 'Esta leitura já está terminada.');
    }

    if (input.finishedOn !== null) {
        ensureEndDate(state, reading, input.finishedOn, 'finished_on', today);
    }

    const days = sessionDaysOf(state, reading.id);
    const firstDay =
        days.length === 0
            ? undefined
            : days.reduce((min, day) => (day < min ? day : min));
    const book = bookRowOf(state, reading.book_id);

    reading.started_at ??= startedOnFinish(firstDay, input.finishedOn);
    reading.status = 'read';
    reading.finished_at =
        input.finishedOn === null ? null : startOfDay(input.finishedOn);
    reading.current_page = Math.max(reading.current_page, book.pages ?? 0);
    reading.abandon_reason = null;

    if (input.rating !== null) {
        reading.rating = input.rating;
    }

    const line = phpTrim(input.line ?? '');

    if (line !== '') {
        reading.review =
            reading.review === null ? line : `${line}\n\n${reading.review}`;
    }

    touch(reading);
    removeBookFromQueue(state, reading.book_id);

    return reading;
}

/** ReadingService::abandon: the status change plus the reason and rating the reader gave. */
export function abandonReading(
    state: DemoState,
    readingId: number,
    today: string,
    reason: string | null,
    rating: number | null,
): ReadingRow {
    const reading = readingRowOf(state, readingId);

    if (reading.status === 'read') {
        reject(state, ABANDON_READ_MESSAGE);
    }

    changeReadingStatus(state, readingId, 'abandoned', today);

    const trimmed = phpTrim(reason ?? '');
    reading.abandon_reason = trimmed === '' ? null : trimmed;

    if (rating !== null) {
        reading.rating = rating;
    }

    touch(reading);

    return reading;
}

/** The rating and review the reader edits from the book page; the stamp moves only when one changes. */
export function updateReadingNotes(
    state: DemoState,
    readingId: number,
    changes: { rating?: number | null; review?: string | null },
): ReadingRow {
    const reading = readingRowOf(state, readingId);
    const changed =
        ('rating' in changes && changes.rating !== reading.rating) ||
        ('review' in changes && changes.review !== reading.review);

    if ('rating' in changes) {
        reading.rating = changes.rating ?? null;
    }

    if ('review' in changes) {
        reading.review = changes.review ?? null;
    }

    if (changed) {
        touch(reading);
    }

    return reading;
}

/** ReadingService::reopen: the fix for a reading marked as read by mistake. */
export function reopenReading(state: DemoState, readingId: number): ReadingRow {
    const reading = readingRowOf(state, readingId);

    if (reading.status !== 'read') {
        reject(state, 'Só uma leitura terminada pode ser desmarcada.');
    }

    reading.status = 'reading';
    reading.finished_at = null;
    touch(reading);

    return reading;
}

/** ReadingService::updateDates: a finished or abandoned reading needs both dates. */
export function updateReadingDates(
    state: DemoState,
    readingId: number,
    startedOn: string | null,
    finishedOn: string | null,
    today: string,
): ReadingRow {
    const reading = readingRowOf(state, readingId);
    const closed = CLOSED_STATUSES.includes(reading.status);

    if (reading.status === 'read' && finishedOn === null) {
        reading.started_at = startedOn === null ? null : startOfDay(startedOn);
        reading.finished_at = null;
        touch(reading);

        return reading;
    }

    if (startedOn === null) {
        reject(state, 'Informe o início.');
    }

    if (startedOn > today) {
        reject(state, 'O início não pode ser depois de hoje.');
    }

    if (closed) {
        if (finishedOn === null) {
            reject(state, 'Informe o término.');
        }

        if (finishedOn < startedOn) {
            reject(state, 'O término não pode ser antes do início.');
        }

        ensureEndDate(state, reading, finishedOn, 'finished_at', today);
    }

    reading.started_at = startOfDay(startedOn);
    reading.finished_at =
        closed && finishedOn !== null ? startOfDay(finishedOn) : null;
    touch(reading);

    return reading;
}

/** Deletes a reading from the history with its sessions. A book keeps its only reading. */
export function deleteReading(state: DemoState, readingId: number): void {
    const reading = readingRowOf(state, readingId);

    if (
        readingsOfBookRows(state, reading.book_id).length <=
        MIN_READINGS_PER_BOOK
    ) {
        reject(
            state,
            'Esta é a única leitura do livro. Para apagá-la, remova o livro da biblioteca.',
        );
    }

    removeRows(state, 'readings', new Set([readingId]));
}

function ensureWithinBook(
    state: DemoState,
    reading: ReadingRow,
    pageTo: number,
): void {
    const pages = bookRowOf(state, reading.book_id).pages;

    if (pages !== null && pageTo > pages) {
        reject(state, 'O livro tem :pages páginas.', { pages });
    }
}

/** ReadingService::syncCurrentPage: the current page follows the last logged session. */
function syncCurrentPage(state: DemoState, reading: ReadingRow): void {
    const pages = sessionsOfReadingRows(state, reading.id).map(
        (session) => session.page_to,
    );

    if (pages.length > 0) {
        reading.current_page = Math.max(...pages);
        touch(reading);
    }
}

/**
 * ReadingService::registerSession: logs the pages read from the page after the current one.
 * A "want to read" book becomes "reading" on its first session.
 */
export function registerSession(
    state: DemoState,
    readingId: number,
    pageTo: number,
    minutes: number | null,
    today: string,
): ReadingSessionRow {
    const reading = readingRowOf(state, readingId);

    if (!OPEN_STATUSES.includes(reading.status)) {
        reject(state, 'Mude a estante para "Lendo" para registrar sessões.');
    }

    ensureWithinBook(state, reading, pageTo);

    if (pageTo <= reading.current_page) {
        reject(state, 'Informe uma página depois da pág. :page.', {
            page: reading.current_page,
        });
    }

    const stamp = localDateTime(new Date());
    const session: ReadingSessionRow = {
        id: nextRowId(state.tables.reading_sessions),
        reading_id: reading.id,
        read_on: startOfDay(today),
        page_from: reading.current_page + 1,
        page_to: pageTo,
        minutes,
        created_at: stamp,
        updated_at: stamp,
    };

    state.tables.reading_sessions.push(session);
    reading.current_page = pageTo;

    if (reading.status === 'want_to_read') {
        changeReadingStatus(state, reading.id, 'reading', today);
    } else {
        touch(reading);
    }

    return session;
}

/** ReadingService::updateSession: the starting page stays as logged; the end page can move. */
export function updateSession(
    state: DemoState,
    sessionId: number,
    readOn: string,
    pageTo: number,
    minutes: number | null,
): ReadingSessionRow {
    const session = sessionRowOf(state, sessionId);
    const reading = readingRowOf(state, session.reading_id);

    if (pageTo < session.page_from) {
        reject(state, 'Use uma página a partir da :page.', {
            page: session.page_from,
        });
    }

    ensureWithinBook(state, reading, pageTo);

    const wasLast = session.page_to === reading.current_page;

    session.read_on = startOfDay(readOn);
    session.page_to = pageTo;
    session.minutes = minutes;
    touch(session);

    if (wasLast) {
        syncCurrentPage(state, reading);
    }

    return session;
}

/** ReadingService::deleteSession: the current page only goes back if the last session is the one removed. */
export function deleteSession(state: DemoState, sessionId: number): void {
    const session = sessionRowOf(state, sessionId);
    const reading = readingRowOf(state, session.reading_id);
    const wasLast = session.page_to === reading.current_page;

    removeRows(state, 'reading_sessions', new Set([sessionId]));

    if (wasLast) {
        syncCurrentPage(state, reading);
    }
}
