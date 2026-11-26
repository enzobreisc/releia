import type { BookDetail, BookCard, SpineBook } from '@/types';
import type { BookRow } from '../state/types';
import { authorLastName } from '../support/names';
import { publisherKey } from '../support/publisher-key';
import { nullableDayOf } from '../support/day';
import {
    authorNamesOf,
    authorsOf,
    bookCoverUrl,
    currentReadingOf,
    readingsOfBook,
} from '../domain/books';
import type { ReadModel } from '../domain/read-model';
import { bookSourceLabel, readingStatusLabel } from '../support/labels';

type BookCardOptions = {
    queuePosition?: number | null;
    readingsCount?: number | null;
};

/** BookPresenter::card: the shelf status comes from the book's current reading. */
export function bookCard(
    model: ReadModel,
    book: BookRow,
    options: BookCardOptions = {},
): BookCard {
    const reading = currentReadingOf(model, book.id);

    return {
        id: book.id,
        title: book.title,
        authors: authorNamesOf(model, book.id),
        cover_url: bookCoverUrl(book),
        status: reading?.status ?? null,
        status_label:
            reading === null
                ? null
                : readingStatusLabel(model.locale, reading.status),
        rating: reading?.rating ?? null,
        queue_position: options.queuePosition ?? null,
        readings_count: options.readingsCount ?? null,
    };
}

/** BookPresenter::spine: what the shelf needs to draw one book. */
export function spineBook(
    model: ReadModel,
    book: BookRow,
    options: BookCardOptions = {},
): SpineBook {
    const [firstAuthor] = authorsOf(model, book.id);

    return {
        ...bookCard(model, book, options),
        author: firstAuthor?.name ?? null,
        author_surname: authorLastName(firstAuthor?.name ?? null),
        publisher: book.publisher,
        publisher_key: publisherKey(book.publisher),
        pages: book.pages,
        is_lying_down: book.is_lying_down === 1,
    };
}

export function bookDetail(model: ReadModel, book: BookRow): BookDetail {
    const reading = currentReadingOf(model, book.id);

    return {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        authors: authorNamesOf(model, book.id),
        author_links: authorsOf(model, book.id).map((author) => ({
            id: author.id,
            name: author.name,
        })),
        isbn_13: book.isbn_13,
        publisher: book.publisher,
        published_year: book.published_year,
        pages: book.pages,
        genre: book.genre,
        series: book.series,
        series_position: book.series_position,
        description: book.description,
        cover_url: bookCoverUrl(book),
        source_label: bookSourceLabel(model.locale, book.source),
        reading:
            reading === null
                ? null
                : {
                      id: reading.id,
                      status: reading.status,
                      abandon_reason: reading.abandon_reason,
                      rating: reading.rating,
                      review: reading.review,
                      started_at: nullableDayOf(reading.started_at),
                      finished_at: nullableDayOf(reading.finished_at),
                      current_page: reading.current_page,
                  },
        readings_count: readingsOfBook(model, book.id).length,
    };
}
