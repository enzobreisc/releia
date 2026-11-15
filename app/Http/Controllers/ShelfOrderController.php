<?php

namespace App\Http\Controllers;

use App\Http\Requests\MoveBookRequest;
use App\Models\Book;
use App\Services\Bookcase;
use App\Services\ShelfOrder;
use Illuminate\Http\RedirectResponse;

class ShelfOrderController extends Controller
{
    public function move(MoveBookRequest $request, Book $book, ShelfOrder $shelfOrder, Bookcase $bookcase): RedirectResponse
    {
        $beforeBookId = $request->validated('before_book_id');

        $shelfOrder->move($book, $beforeBookId === null ? null : (int) $beforeBookId);

        if ($request->has('bookshelf_id')) {
            $bookcase->placeOn($book, $request->integer('bookshelf_id') ?: null);
        }

        return back();
    }
}
