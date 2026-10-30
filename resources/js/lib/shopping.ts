import type { ShoppingEntry } from '@/types/queue';

/** Sum of the noted prices, in cents; items without a price count as zero. */
export function sumPrices(items: ShoppingEntry[]): number {
    return items.reduce(
        (sum, item) => sum + (item.estimated_price_cents ?? 0),
        0,
    );
}
