<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Bookshelf;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Prateleiras personalizadas da estante: criar, renomear, apagar e mover livros. */
class BookshelfController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60']]);

        Bookshelf::create(['name' => trim($data['name']), 'position' => (int) Bookshelf::max('position') + 1]);

        return back();
    }

    public function update(Request $request, Bookshelf $bookshelf): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:60']]);

        $bookshelf->update(['name' => trim($data['name'])]);

        return back();
    }

    /** Apagar a prateleira devolve os livros para "Sem prateleira". */
    public function destroy(Bookshelf $bookshelf): RedirectResponse
    {
        $bookshelf->delete();

        Toast::success('Prateleira apagada', $bookshelf->name);

        return back();
    }

    /**
     * Põe o livro numa prateleira (ou tira, com `bookshelf_id` nulo), antes de outro
     * livro quando `before_book_id` vem, senão no fim.
     */
    public function move(Request $request, Book $book): RedirectResponse
    {
        $data = $request->validate([
            'bookshelf_id' => ['nullable', 'integer', 'exists:bookshelves,id'],
            'before_book_id' => ['nullable', 'integer', 'exists:books,id'],
        ]);

        DB::transaction(function () use ($book, $data) {
            $shelfId = $data['bookshelf_id'] ?? null;
            $before = $data['before_book_id'] ?? null;

            $ids = $shelfId === null
                ? []
                : Book::query()->where('bookshelf_id', $shelfId)->where('id', '!=', $book->id)->orderBy('shelf_position')->orderBy('id')->pluck('id')->all();

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
