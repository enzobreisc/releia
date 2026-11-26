import type { QueueCandidate, QueueEntry, ShoppingEntry } from '@/types/queue';
import { translateText } from '@/lib/i18n';
import type { BookRow, QueueItemRow, ShoppingItemRow } from '../state/types';
import { bookOf, currentReadingOf, isInQueue } from '../domain/books';
import type { ReadModel } from '../domain/read-model';
import {
    amazonIsbnLink,
    amazonTitleLink,
    isAmazonUrl,
} from '../support/amazon-link';
import { nullableDayOf } from '../support/day';
import { storeLinks } from '../support/store-links';
import { storeTypeLabel } from '../support/labels';
import { bookCard } from './books';

const PRICE_STALE_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

type QueueForecast = {
    estimated_days: number | null;
    finishes_on: string | null;
};

/** QueueEntry: a queued book with the forecast the queue page computed for it. */
export function queueEntry(
    model: ReadModel,
    item: QueueItemRow,
    forecast: QueueForecast,
): QueueEntry {
    const book = bookOf(model, item.book_id);

    return {
        ...bookCard(model, book),
        queue_item_id: item.id,
        position: item.position,
        pages: book.pages,
        estimated_days: forecast.estimated_days,
        finishes_on: forecast.finishes_on,
    };
}

export function queueCandidate(
    model: ReadModel,
    book: BookRow,
): QueueCandidate {
    return {
        id: book.id,
        title: book.title,
        is_reread: currentReadingOf(model, book.id)?.status === 'read',
    };
}

/** Checked more than 30 days before now: the price may have changed. */
function isPriceStale(checkedAt: string, now: Date): boolean {
    const cutoff = now.getTime() - PRICE_STALE_DAYS * MILLISECONDS_PER_DAY;

    return Date.parse(checkedAt.replace(' ', 'T')) < cutoff;
}

function shoppingLink(item: ShoppingItemRow): string {
    if (item.url !== null) {
        return item.url;
    }

    return item.isbn !== null
        ? amazonIsbnLink(item.isbn)
        : amazonTitleLink(item.title, item.author);
}

/** ShoppingItem::shopUrl and QueuePresenter::shoppingItem for one wishlist row. */
export function shoppingEntry(
    model: ReadModel,
    item: ShoppingItemRow,
): ShoppingEntry {
    const { locale } = model;
    const linkLabel =
        item.url === null || isAmazonUrl(item.url)
            ? translateText(locale, 'Ver na Amazon')
            : translateText(locale, 'Abrir link');

    return {
        id: item.id,
        title: item.title,
        author: item.author,
        isbn: item.isbn,
        cover_url: item.cover_url,
        link: shoppingLink(item),
        link_label: linkLabel,
        stores: storeLinks(item.isbn, item.title, item.author, locale),
        saved_link: item.url,
        store_type: item.store_type,
        store_label: storeTypeLabel(locale, item.store_type),
        is_priority: item.is_priority === 1,
        estimated_price_cents: item.estimated_price_cents,
        price_checked_on: nullableDayOf(item.price_checked_at),
        price_stale:
            item.bought_at === null &&
            item.price_checked_at !== null &&
            isPriceStale(item.price_checked_at, model.now),
        bought: item.bought_at !== null,
        bought_on: nullableDayOf(item.bought_at),
        book_id: item.book_id,
        queued: item.book_id !== null && isInQueue(model, item.book_id),
    };
}
