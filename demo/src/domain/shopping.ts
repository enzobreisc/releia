import { compareText } from '../support/collections';
import type { DemoState, ShoppingItemRow, StoreType } from '../state/types';
import type { ReadModel } from './read-model';
import { readSetting } from './settings';

const SHOPPING_SORTS = ['price_asc', 'price_desc', 'title', 'recent'] as const;

type ShoppingSort = (typeof SHOPPING_SORTS)[number];

export type ShoppingFilter = {
    store: StoreType | null;
    search: string;
    sort: ShoppingSort | null;
};

const QUEUE_ON_BUY_SETTING = 'shopping_queue_on_buy';
const QUEUE_ON_BUY_DEFAULT = true;

export function isShoppingSort(value: string): value is ShoppingSort {
    return SHOPPING_SORTS.some((sort) => sort === value);
}

export function findShoppingItem(
    state: DemoState,
    itemId: number,
): ShoppingItemRow | undefined {
    return state.tables.shopping_items.find((item) => item.id === itemId);
}

function isPending(item: ShoppingItemRow): boolean {
    return item.bought_at === null;
}

/** Shopping items in the order the list shows them, for every filter at once. */
function itemsInListOrder(
    items: readonly ShoppingItemRow[],
    sort: ShoppingSort | null,
): ShoppingItemRow[] {
    return [...items].sort(
        (left, right) =>
            compareBought(left, right) ||
            Number(right.is_priority) - Number(left.is_priority) ||
            compareBySort(left, right, sort) ||
            left.id - right.id,
    );
}

function compareBought(left: ShoppingItemRow, right: ShoppingItemRow): number {
    return Number(left.bought_at !== null) - Number(right.bought_at !== null);
}

function compareBySort(
    left: ShoppingItemRow,
    right: ShoppingItemRow,
    sort: ShoppingSort | null,
): number {
    switch (sort) {
        case 'price_asc':
            return comparePrices(left, right, 1);
        case 'price_desc':
            return comparePrices(left, right, -1);
        case 'title':
            return compareText(left.title, right.title);
        case 'recent':
            return right.id - left.id;
        case null:
            return 0;
    }
}

/** Unpriced items go last in both directions. */
function comparePrices(
    left: ShoppingItemRow,
    right: ShoppingItemRow,
    direction: 1 | -1,
): number {
    const leftPrice = left.estimated_price_cents;
    const rightPrice = right.estimated_price_cents;

    if (leftPrice === null || rightPrice === null) {
        return Number(leftPrice === null) - Number(rightPrice === null);
    }

    return direction * (leftPrice - rightPrice);
}

function matchesSearch(item: ShoppingItemRow, search: string): boolean {
    if (search === '') {
        return true;
    }

    const needle = search.toLowerCase();

    return (
        item.title.toLowerCase().includes(needle) ||
        item.author.toLowerCase().includes(needle)
    );
}

/** ShoppingService::list: the filters, then the list order. */
export function filterShoppingItems(
    state: DemoState,
    filter: ShoppingFilter,
): ShoppingItemRow[] {
    const matching = state.tables.shopping_items.filter(
        (item) =>
            (filter.store === null || item.store_type === filter.store) &&
            matchesSearch(item, filter.search),
    );

    return itemsInListOrder(matching, filter.sort);
}

/** Pending items per store, ignoring the current filter. */
export function pendingCountsByStore(
    state: DemoState,
): Record<StoreType, number> {
    const counts: Record<StoreType, number> = {
        used_bookstore: 0,
        bookstore: 0,
        online: 0,
    };

    for (const item of state.tables.shopping_items.filter(isPending)) {
        counts[item.store_type] += 1;
    }

    return counts;
}

/** ShoppingService::queueOnBuy: the saved preference, on by default. */
export function isQueueOnBuy(model: ReadModel): boolean {
    const value = readSetting(model, QUEUE_ON_BUY_SETTING);

    return typeof value === 'boolean' ? value : QUEUE_ON_BUY_DEFAULT;
}

export const QUEUE_ON_BUY_KEY = QUEUE_ON_BUY_SETTING;

export function pendingShoppingCount(state: DemoState): number {
    return state.tables.shopping_items.filter(isPending).length;
}
