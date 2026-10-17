<?php

namespace App\Console\Commands;

use App\Models\ShoppingItem;
use App\Services\ShoppingService;
use App\Support\Money;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('releia:fill-shopping-prices')]
#[Description('Busca o preço de referência dos itens por comprar que têm ISBN e ainda não têm preço')]
class FillShoppingPrices extends Command
{
    public function handle(ShoppingService $shopping): int
    {
        $items = ShoppingItem::query()
            ->whereNull('bought_at')
            ->whereNull('estimated_price_cents')
            ->whereNotNull('isbn')
            ->get();

        foreach ($items as $item) {
            $cents = $shopping->lookupPrice($item);

            $this->line($cents === null
                ? "sem preço: {$item->title}"
                : "{$item->title}: ".Money::format($cents));
        }

        $this->info("{$items->count()} itens verificados.");

        return self::SUCCESS;
    }
}
