<?php

namespace App\Http\Controllers;

use App\Http\Requests\ShoppingItemRequest;
use App\Http\Requests\ShoppingPriceRequest;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\ShoppingService;
use App\Services\UndoService;
use App\Support\Money;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Native\Desktop\Facades\Shell;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ShoppingController extends Controller
{
    public function __construct(private readonly ShoppingService $shopping) {}

    public function store(ShoppingItemRequest $request): RedirectResponse
    {
        $item = $this->shopping->add($request->payload());

        Toast::success('Adicionado à lista de compras', $item->title);

        return back();
    }

    public function update(ShoppingPriceRequest $request, ShoppingItem $shoppingItem): RedirectResponse
    {
        $this->shopping->updatePrice($shoppingItem, $request->cents());

        Toast::success('Preço atualizado', $shoppingItem->title);

        return back();
    }

    /**
     * Abre o link de compra no navegador padrão. A janela nativa não abre abas
     * novas, então o pedido passa pelo Shell do NativePHP.
     */
    public function open(ShoppingItem $shoppingItem): RedirectResponse|SymfonyResponse
    {
        if (! config('nativephp-internal.running')) {
            return Inertia::location($shoppingItem->shopUrl());
        }

        Shell::openExternal($shoppingItem->shopUrl());

        return back();
    }

    public function destroy(ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([UndoService::scope('shopping_items', ['id' => $shoppingItem->id])]);
        $shoppingItem->delete();

        Toast::success('Item excluído', $shoppingItem->title.$this->priceSuffix($shoppingItem), null, $undo->remember($snapshot));

        return back();
    }

    /** Compra o item: cria o livro na biblioteca e, pela preferência salva, põe na fila. */
    public function buy(Request $request, ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        $queue = $request->has('queue') ? $request->boolean('queue') : ShoppingService::queueOnBuy();
        $snapshot = $undo->capture([
            UndoService::scope('shopping_items', ['id' => $shoppingItem->id]),
            UndoService::scope('queue_items'),
        ]);

        $this->shopping->buy($shoppingItem, $queue);
        $shoppingItem->refresh();

        // Desfazer devolve o item como não comprado, mas mantém o vínculo com o livro já criado.
        $snapshot = $undo->override($snapshot, 'shopping_items', ['book_id' => $shoppingItem->book_id]);
        $position = $shoppingItem->book_id === null ? null : QueueItem::query()->where('book_id', $shoppingItem->book_id)->value('position');

        Toast::success(
            'Comprado',
            $shoppingItem->title.($queue && $position !== null
                ? ' · foi para quero ler e entrou em '.Toast::ordinal((int) $position).' na fila'
                : ' · foi para quero ler'),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /** Desmarca a compra (D10). */
    public function unbuy(ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([
            UndoService::scope('shopping_items', ['id' => $shoppingItem->id]),
            UndoService::scope('queue_items'),
        ]);

        $wasQueued = $shoppingItem->book_id !== null && QueueItem::query()->where('book_id', $shoppingItem->book_id)->exists();
        $this->shopping->unbuy($shoppingItem);
        $stillQueued = $shoppingItem->book_id !== null && QueueItem::query()->where('book_id', $shoppingItem->book_id)->exists();

        Toast::success(
            'Desmarcado como comprado',
            $shoppingItem->title.($wasQueued && ! $stillQueued ? ' · saiu da fila' : ''),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /** Preferência "ao comprar": só quero ler ou quero ler + fila. */
    public function preference(Request $request): RedirectResponse
    {
        $data = $request->validate(['queue_on_buy' => ['required', 'boolean']]);

        ShoppingService::setQueueOnBuy((bool) $data['queue_on_buy']);

        return back();
    }

    private function priceSuffix(ShoppingItem $item): string
    {
        return $item->estimated_price_cents === null ? '' : ' · '.Money::format($item->estimated_price_cents);
    }
}
