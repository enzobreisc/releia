<?php

namespace App\Enums;

use App\Models\ShoppingItem;
use Illuminate\Database\Eloquent\Builder;

enum ShoppingSort: string
{
    case PriceAsc = 'price_asc';
    case PriceDesc = 'price_desc';
    case Title = 'title';
    case Recent = 'recent';

    /**
     * @param  Builder<ShoppingItem>  $query
     * @return Builder<ShoppingItem>
     */
    public function apply(Builder $query): Builder
    {
        return match ($this) {
            self::PriceAsc => $query->orderByRaw('estimated_price_cents IS NULL')->orderBy('estimated_price_cents'),
            self::PriceDesc => $query->orderByRaw('estimated_price_cents IS NULL')->orderByDesc('estimated_price_cents'),
            self::Title => $query->orderBy('title'),
            self::Recent => $query->orderByDesc('id'),
        };
    }
}
