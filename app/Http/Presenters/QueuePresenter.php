<?php

namespace App\Http\Presenters;

use App\Models\QueueItem;
use App\Models\ShoppingItem;
use Illuminate\Support\Collection;

/** Formato da fila e da lista de compras enviado à página de Fila. */
final class QueuePresenter
{
    /**
     * Item da fila com a estimativa de dias já calculada.
     *
     * @return array<string, mixed>
     */
    public static function queueItem(QueueItem $item, ?int $days): array
    {
        return [
            ...BookPresenter::card($item->book),
            'queue_item_id' => $item->id,
            'position' => $item->position,
            'pages' => $item->book->pages,
            'estimated_days' => $days,
        ];
    }

    /**
     * @param  Collection<int, int>  $queuedBookIds  livros que estão na fila agora
     * @return array<string, mixed>
     */
    public static function shoppingItem(ShoppingItem $item, Collection $queuedBookIds): array
    {
        return [
            'id' => $item->id,
            'title' => $item->title,
            'author' => $item->author,
            'isbn' => $item->isbn,
            'store_type' => $item->store_type->value,
            'store_label' => $item->store_type->label(),
            'estimated_price_cents' => $item->estimated_price_cents,
            'bought' => $item->bought_at !== null,
            'bought_on' => $item->bought_at?->toDateString(),
            'book_id' => $item->book_id,
            'queued' => $item->book_id !== null && $queuedBookIds->contains($item->book_id),
        ];
    }
}
