<?php

namespace App\Http\Controllers;

use App\Http\Requests\ShoppingItemRequest;
use App\Models\ShoppingItem;
use App\Services\ShoppingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ShoppingController extends Controller
{
    public function __construct(private readonly ShoppingService $shopping) {}

    public function store(ShoppingItemRequest $request): RedirectResponse
    {
        $this->shopping->add($request->payload());

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
