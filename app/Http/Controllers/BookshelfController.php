<?php

namespace App\Http\Controllers;

use App\Http\Requests\MergeBookshelfRequest;
use App\Http\Requests\SaveBookshelfRequest;
use App\Models\Bookshelf;
use App\Services\Bookcase;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;

class BookshelfController extends Controller
{
    public function store(SaveBookshelfRequest $request, Bookcase $bookcase): RedirectResponse
    {
        $bookcase->addShelf($request->shelfName());

        return back();
    }

    public function update(SaveBookshelfRequest $request, Bookshelf $bookshelf): RedirectResponse
    {
        $bookshelf->update(['name' => $request->shelfName()]);

        return back();
    }

    public function merge(MergeBookshelfRequest $request, Bookshelf $bookshelf, Bookcase $bookcase): RedirectResponse
    {
        $absorbed = Bookshelf::query()->findOrFail($request->integer('absorbed_id'));
        abort_if($bookshelf->is_catch_all || $absorbed->is_catch_all, 422);

        $bookcase->merge($bookshelf, $absorbed);

        Toast::success(__('Prateleiras unidas'), $bookshelf->name);

        return back();
    }

    public function destroy(Bookshelf $bookshelf, Bookcase $bookcase): RedirectResponse
    {
        abort_if($bookshelf->is_catch_all, 422);

        $bookcase->removeShelf($bookshelf);

        Toast::success(__('Prateleira apagada'), $bookshelf->name);

        return back();
    }
}
