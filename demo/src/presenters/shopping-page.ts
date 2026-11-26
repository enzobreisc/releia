import type { ShoppingEntry, StoreOption } from '@/types/queue';
import {
    filterShoppingItems,
    isQueueOnBuy,
    pendingCountsByStore,
    type ShoppingFilter,
} from '../domain/shopping';
import { STORE_TYPES } from '../domain/shopping-input';
import type { ReadModel } from '../domain/read-model';
import { storeTypeLabel } from '../support/labels';
import { shoppingEntry } from './queue';

type ShoppingPageProps = {
    shopping: ShoppingEntry[];
    stores: StoreOption[];
    filters: {
        store: string | null;
        q: string | null;
        sort: string | null;
    };
    queue_on_buy: boolean;
    queue_count: number;
    totals: { pending_count: number; pending_cents: number };
};

function storeOptions(model: ReadModel): StoreOption[] {
    const counts = pendingCountsByStore(model.state);

    return STORE_TYPES.map((value) => ({
        value,
        label: storeTypeLabel(model.locale, value),
        count: counts[value],
    }));
}

function pendingTotals(entries: readonly ShoppingEntry[]): {
    pending_count: number;
    pending_cents: number;
} {
    const pending = entries.filter((entry) => !entry.bought);

    return {
        pending_count: pending.length,
        pending_cents: pending.reduce(
            (sum, entry) => sum + (entry.estimated_price_cents ?? 0),
            0,
        ),
    };
}

/** ShoppingController::index: the filtered list, with the counts that ignore the filter. */
export function shoppingPageProps(
    model: ReadModel,
    filter: ShoppingFilter,
): ShoppingPageProps {
    const shopping = filterShoppingItems(model.state, filter).map((item) =>
        shoppingEntry(model, item),
    );

    return {
        shopping,
        stores: storeOptions(model),
        filters: {
            store: filter.store,
            q: filter.search !== '' ? filter.search : null,
            sort: filter.sort,
        },
        queue_on_buy: isQueueOnBuy(model),
        queue_count: model.queueItems.length,
        totals: pendingTotals(shopping),
    };
}
