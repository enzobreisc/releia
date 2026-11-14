<?php

namespace App\Services;

use App\Models\Book;
use App\Support\AuthorName;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The library is one ordered line of books. A book nobody has placed yet sorts by author,
 * series and title and slides in next to its neighbours; dragging a book fixes the whole line.
 */
class ShelfOrder
{
    /**
     * @return list<int> book ids, first slot to last
     */
    public function ids(): array
    {
        $books = $this->load();
        $keys = $books->mapWithKeys(fn (Book $book) => [$book->id => $this->sortKey($book)])->all();

        $unplaced = array_values($books->whereNull('shelf_position')->map(fn (Book $book) => $book->id)->all());
        usort($unplaced, fn (int $a, int $b) => $keys[$a] <=> $keys[$b]);

        return $this->mergeBySortKey($this->placedIds($books), $unplaced, $keys);
    }

    public function move(Book $book, ?int $beforeBookId): void
    {
        if ($beforeBookId === $book->id) {
            return;
        }

        DB::transaction(function () use ($book, $beforeBookId) {
            $order = array_values(array_diff($this->ids(), [$book->id]));
            $at = $beforeBookId === null ? false : array_search($beforeBookId, $order, true);
            array_splice($order, $at === false ? count($order) : $at, 0, [$book->id]);

            $this->savePositions($order);
        });
    }

    /**
     * @return Collection<int, Book>
     */
    private function load(): Collection
    {
        return Book::query()->with('authors')->get(['id', 'title', 'series', 'series_position', 'shelf_position']);
    }

    /**
     * @param  Collection<int, Book>  $books
     * @return list<int>
     */
    private function placedIds(Collection $books): array
    {
        $placed = $books->whereNotNull('shelf_position')
            ->sort(fn (Book $a, Book $b) => [$a->shelf_position, $a->id] <=> [$b->shelf_position, $b->id]);

        return array_values($placed->map(fn (Book $book) => $book->id)->all());
    }

    /**
     * Slides each unplaced book in before the first placed book that sorts after it.
     * Both lists are walked once, so a library with no placed books costs one sort.
     *
     * @param  list<int>  $placed
     * @param  list<int>  $unplaced  sorted by key
     * @param  array<int, array<int, int|string>>  $keys  book id => sort key
     * @return list<int>
     */
    private function mergeBySortKey(array $placed, array $unplaced, array $keys): array
    {
        $order = $placed;
        $cursor = 0;

        foreach ($unplaced as $id) {
            while ($cursor < count($order) && ($keys[$order[$cursor]] <=> $keys[$id]) <= 0) {
                $cursor++;
            }

            array_splice($order, $cursor, 0, [$id]);
            $cursor++;
        }

        return $order;
    }

    /**
     * @param  list<int>  $order
     */
    private function savePositions(array $order): void
    {
        $current = Book::query()->pluck('shelf_position', 'id');

        // `updated_at` versions the cover URL, so moving a book must not make every cover download again.
        Book::withoutTimestamps(function () use ($order, $current) {
            foreach ($order as $position => $id) {
                if ($current[$id] !== $position) {
                    Book::query()->whereKey($id)->update(['shelf_position' => $position]);
                }
            }
        });
    }

    /**
     * Books without an author go last. A standalone book sorts by its title,
     * as if it were a series of one, so it sits among the series by name.
     *
     * @return array{int, string, string, string, int, string, int}
     */
    private function sortKey(Book $book): array
    {
        $author = $book->authors->first()?->name;

        return [
            $author === null ? 1 : 0,
            AuthorName::surname($author),
            Book::normalizeSearch($author ?? ''),
            Book::normalizeSearch($book->series ?? $book->title),
            $book->series_position ?? 0,
            Book::normalizeSearch($book->title),
            $book->id,
        ];
    }
}
