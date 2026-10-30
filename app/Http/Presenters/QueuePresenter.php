<?php

namespace App\Http\Presenters;

use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Support\AmazonLink;
use App\Support\StoreLinks;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/** Shape of the queue and the shopping list sent to the Queue page. */
final class QueuePresenter
{
    public const PRICE_STALE_DAYS = 30;

    /**
     * Queue item with the days estimate already computed.
     *
     * @return array<string, mixed>
     */
    public static function queueItem(QueueItem $item, ?int $days, ?CarbonInterface $finishesOn = null): array
    {
        return [
            ...BookPresenter::card($item->book),
            'queue_item_id' => $item->id,
            'position' => $item->position,
            'pages' => $item->book->pages,
            'estimated_days' => $days,
            'finishes_on' => $finishesOn?->toDateString(),
        ];
    }

    /**
     * @param  Collection<int, int>  $queuedBookIds  books currently in the queue
     * @return array<string, mixed>
     */
    public static function shoppingItem(ShoppingItem $item, Collection $queuedBookIds): array
    {
        return [
            'id' => $item->id,
            'title' => $item->title,
            'author' => $item->author,
            'isbn' => $item->isbn,
            'cover_url' => $item->cover_path === null
                ? $item->cover_url
                : route('shopping.cover', ['shoppingItem' => $item, 'v' => $item->updated_at?->timestamp], absolute: false),
            'link' => $item->shopUrl(),
            // Generated link (Amazon search) or pasted by hand.
            'link_label' => $item->url === null || AmazonLink::isAmazon($item->url) ? __('Ver na Amazon') : __('Abrir link'),
            // Every store with a ready-made search; the pasted link, if any, goes separately.
            'stores' => StoreLinks::all($item->isbn, $item->title, $item->author),
            'saved_link' => $item->url,
            'store_type' => $item->store_type->value,
            'store_label' => $item->store_type->label(),
            'is_priority' => $item->is_priority,
            'estimated_price_cents' => $item->estimated_price_cents,
            'price_checked_on' => $item->price_checked_at?->toDateString(),
            // Price noted more than PRICE_STALE_DAYS ago: worth checking again.
            'price_stale' => $item->bought_at === null
                && $item->price_checked_at !== null
                && $item->price_checked_at->lt(now()->subDays(self::PRICE_STALE_DAYS)),
            'bought' => $item->bought_at !== null,
            'bought_on' => $item->bought_at?->toDateString(),
            'book_id' => $item->book_id,
            'queued' => $item->book_id !== null && $queuedBookIds->contains($item->book_id),
        ];
    }
}
