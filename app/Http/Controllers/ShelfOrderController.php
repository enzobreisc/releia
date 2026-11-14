<?php

namespace App\Http\Controllers;

use App\Http\Requests\MoveBookRequest;
use App\Models\Book;
use App\Services\ShelfOrder;
use Illuminate\Http\RedirectResponse;

class ShelfOrderController extends Controller
{
    public function move(MoveBookRequest $request, Book $book, ShelfOrder $shelfOrder): RedirectResponse
    {
        $beforeBookId = $request->validated('before_book_id');

        $shelfOrder->move($book, $beforeBookId === null ? null : (int) $beforeBookId);

        return back();
    }
}
