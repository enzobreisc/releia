<?php

namespace App\Http\Controllers;

use App\Http\Requests\ShoppingItemRequest;
use App\Http\Requests\ShoppingPriceRequest;
use App\Models\ShoppingItem;
use App\Services\ShoppingService;
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
        $this->shopping->add($request->payload());

        return back();
    }

    public function update(ShoppingPriceRequest $request, ShoppingItem $shoppingItem): RedirectResponse
    {
        $this->shopping->updatePrice($shoppingItem, $request->cents());

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

    public function destroy(ShoppingItem $shoppingItem): RedirectResponse
    {
        $shoppingItem->delete();

        return back();
    }

    /** Compra o item: cria o livro na biblioteca e, se pedido, põe na fila. */
    public function buy(Request $request, ShoppingItem $shoppingItem): RedirectResponse
    {
        $this->shopping->buy($shoppingItem, $request->boolean('queue', true));

        return back();
    }
}
