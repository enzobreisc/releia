<?php

namespace App\Http\Controllers;

use App\Enums\ShelfGrouping;
use App\Http\Presenters\BookPresenter;
use App\Http\Requests\OrganizeBookcaseRequest;
use App\Models\Book;
use App\Models\Bookshelf;
use App\Services\Bookcase;
use App\Services\ShelfOrder;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class BookcaseSetupController extends Controller
{
    public function create(Bookcase $bookcase, ShelfOrder $shelfOrder): Response
    {
        $books = Book::query()->with(['authors', 'currentReading'])->get()->keyBy('id');

        return Inertia::render('bookcase-setup', [
            'books' => array_map(fn (int $id) => [
                ...BookPresenter::spine($books[$id]),
                'group_keys' => $this->groupKeys($books[$id]),
            ], $shelfOrder->sortedIds()),
            'groupings' => array_map(fn (ShelfGrouping $grouping) => [
                'value' => $grouping->value,
                'label' => $grouping->label(),
                'groups' => $bookcase->groups($grouping),
            ], ShelfGrouping::cases()),
            'has_shelves' => Bookshelf::query()->exists(),
        ]);
    }

    public function store(OrganizeBookcaseRequest $request, Bookcase $bookcase): RedirectResponse
    {
        /** @var list<array{name: string, group_keys: list<string>}> $shelves */
        $shelves = $request->validated('shelves');

        $bookcase->organize(
            ShelfGrouping::from($request->string('grouping')->toString()),
            $shelves,
            trim($request->string('catch_all_name')->toString()),
        );

        Toast::success(__('Estante montada'));

        return to_route('library.index');
    }

    /**
     * @return array<string, string|null>
     */
    private function groupKeys(Book $book): array
    {
        $keys = [];

        foreach (ShelfGrouping::cases() as $grouping) {
            $keys[$grouping->value] = $grouping->groupOf($book)?->key;
        }

        return $keys;
    }
}
