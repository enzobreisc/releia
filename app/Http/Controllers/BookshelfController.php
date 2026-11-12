<?php

namespace App\Http\Controllers;

use App\Http\Requests\MoveBookRequest;
use App\Http\Requests\StoreBookshelfRequest;
use App\Http\Requests\UpdateBookshelfRequest;
use App\Models\Book;
use App\Models\Bookshelf;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class BookshelfController extends Controller
{
    public function store(StoreBookshelfRequest $request): RedirectResponse
    {
        $data = $request->validated();

        Bookshelf::create(['name' => trim($data['name']), 'position' => (int) Bookshelf::max('position') + 1]);

        return back();
    }

    public function update(UpdateBookshelfRequest $request, Bookshelf $bookshelf): RedirectResponse
    {
        $data = $request->validated();

        $bookshelf->update(['name' => trim($data['name'])]);

        return back();
    }

    /** Deleting the shelf moves its books back to "No shelf". */
    public function destroy(Bookshelf $bookshelf): RedirectResponse
    {
        $bookshelf->delete();

        Toast::success(__('Prateleira apagada'), $bookshelf->name);

        return back();
    }

    public function move(MoveBookRequest $request, Book $book): RedirectResponse
    {
        $data = $request->validated();

        DB::transaction(function () use ($book, $data) {
            $shelfId = $data['bookshelf_id'] ?? null;
            $before = $data['before_book_id'] ?? null;

            $ids = $shelfId === null
                ? []
                : Book::query()->where('bookshelf_id', $shelfId)->where('id', '!=', $book->id)->orderBy('shelf_position')->orderBy('id')->pluck('id')->values()->all();

            $at = $before === null ? false : array_search($before, $ids, true);
            array_splice($ids, $at === false ? count($ids) : $at, 0, [$book->id]);

            Book::query()->whereKey($book->id)->update(['bookshelf_id' => $shelfId]);

            if ($shelfId !== null) {
                foreach ($ids as $position => $id) {
                    Book::query()->whereKey($id)->update(['shelf_position' => $position]);
                }
            }
        });

        return back();
    }
}
