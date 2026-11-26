<?php

namespace App\Services\Recommendation;

use App\Enums\ReadingStatus;
use App\Models\Reading;
use App\Models\ShoppingItem;
use Illuminate\Database\Eloquent\Builder;

/**
 * Books you want to read and items on your shopping list: they have no rating, so they only
 * lead to the same author.
 */
final class InterestSources
{
    public function exist(): bool
    {
        return $this->wantToReadReadings()->exists() || $this->pendingShoppingItems()->exists();
    }

    /**
     * One source per author: the first one found keeps the author, and authors already covered
     * by a rated book are left out.
     *
     * @param  list<string>  $excludedAuthorKeys
     * @return list<Source>
     */
    public function pick(array $excludedAuthorKeys): array
    {
        $seenAuthorKeys = array_fill_keys($excludedAuthorKeys, true);
        $picked = [];

        foreach ([...$this->wantToReadSources(), ...$this->shoppingSources()] as $source) {
            $authorKey = $source->authorKey();

            if ($authorKey === null || isset($seenAuthorKeys[$authorKey])) {
                continue;
            }

            $seenAuthorKeys[$authorKey] = true;
            $picked[] = $source;
        }

        shuffle($picked);

        return $picked;
    }

    /**
     * @return list<Source>
     */
    private function wantToReadSources(): array
    {
        $sources = $this->wantToReadReadings()
            ->with('book.authors')
            ->get()
            ->map(fn (Reading $reading): Source => Source::wantToRead($reading->book))
            ->all();

        return self::shuffled($sources);
    }

    /**
     * @return list<Source>
     */
    private function shoppingSources(): array
    {
        $sources = $this->pendingShoppingItems()
            ->get()
            ->map(fn (ShoppingItem $item): Source => Source::shoppingItem($item))
            ->all();

        return self::shuffled($sources);
    }

    /**
     * @return Builder<Reading>
     */
    private function wantToReadReadings(): Builder
    {
        return Reading::query()
            ->current()
            ->where('status', ReadingStatus::WantToRead)
            ->whereHas('book.authors');
    }

    /**
     * @return Builder<ShoppingItem>
     */
    private function pendingShoppingItems(): Builder
    {
        return ShoppingItem::query()
            ->whereNull('bought_at')
            ->where('author', '!=', '');
    }

    /**
     * @param  array<int, Source>  $sources
     * @return list<Source>
     */
    private static function shuffled(array $sources): array
    {
        $list = array_values($sources);
        shuffle($list);

        return $list;
    }
}
