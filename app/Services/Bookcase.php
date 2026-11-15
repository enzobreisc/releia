<?php

namespace App\Services;

use App\Enums\ShelfGrouping;
use App\Models\Book;
use App\Models\Bookshelf;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class Bookcase
{
    /**
     * @return Collection<int, Bookshelf>
     */
    public function shelves(): Collection
    {
        return Bookshelf::query()->orderBy('position')->orderBy('id')->get();
    }

    /**
     * A book placed by hand stays where it was put; any other goes to the first shelf
     * that claims its group, then to the catch-all shelf.
     *
     * @param  iterable<Book>  $books  with authors loaded
     * @return array<int, int|null> book id => shelf id
     */
    public function shelfIds(iterable $books): array
    {
        $shelves = $this->shelves();
        $catchAllId = $shelves->firstWhere('is_catch_all', true)?->id;
        $placements = [];

        foreach ($books as $book) {
            $placements[$book->id] = $book->bookshelf_id
                ?? $shelves->first(fn (Bookshelf $shelf) => $shelf->claims($book))->id
                ?? $catchAllId;
        }

        return $placements;
    }

    /**
     * @return list<array{key: string, label: string, count: int}> largest group first
     */
    public function groups(ShelfGrouping $grouping): array
    {
        $groups = [];

        foreach (Book::query()->with('authors')->get() as $book) {
            $group = $grouping->groupOf($book);

            if ($group === null) {
                continue;
            }

            $groups[$group->key] ??= ['key' => $group->key, 'label' => $group->label, 'count' => 0];
            $groups[$group->key]['count']++;
        }

        usort($groups, fn (array $a, array $b) => [$b['count'], $a['key']] <=> [$a['count'], $b['key']]);

        return $groups;
    }

    /**
     * Rebuilds the bookcase: the given shelves in order, each claiming one or more groups,
     * and a catch-all shelf for the rest. Hand-made placements and order are discarded.
     *
     * @param  list<array{name: string, group_keys: list<string>}>  $shelves
     */
    public function organize(ShelfGrouping $grouping, array $shelves, string $catchAllName): void
    {
        $knownKeys = array_column($this->groups($grouping), 'key');

        DB::transaction(function () use ($grouping, $shelves, $knownKeys, $catchAllName) {
            Bookshelf::query()->delete();
            $this->withoutTouchingBooks(fn () => Book::query()->update(['bookshelf_id' => null, 'shelf_position' => null]));
            $position = 0;

            foreach ($shelves as $shelf) {
                $groupKeys = array_values(array_intersect($shelf['group_keys'], $knownKeys));

                if ($groupKeys !== []) {
                    Bookshelf::create([
                        'name' => $shelf['name'],
                        'position' => $position++,
                        'grouping' => $grouping,
                        'group_keys' => $groupKeys,
                    ]);
                }
            }

            Bookshelf::create(['name' => $catchAllName, 'position' => $position, 'is_catch_all' => true]);
        });
    }

    /** The kept shelf takes over the groups and the hand-placed books of the absorbed one. */
    public function merge(Bookshelf $kept, Bookshelf $absorbed): void
    {
        DB::transaction(function () use ($kept, $absorbed) {
            $kept->update([
                'grouping' => $kept->grouping ?? $absorbed->grouping,
                'group_keys' => $this->mergedGroupKeys($kept, $absorbed),
            ]);
            $this->withoutTouchingBooks(fn () => Book::query()->where('bookshelf_id', $absorbed->id)->update(['bookshelf_id' => $kept->id]));
            $absorbed->delete();
        });
    }

    /**
     * Groups of another grouping cannot follow: a shelf claims by one grouping only.
     *
     * @return list<string>|null
     */
    private function mergedGroupKeys(Bookshelf $kept, Bookshelf $absorbed): ?array
    {
        $grouping = $kept->grouping ?? $absorbed->grouping;
        $keys = [];

        foreach ([$kept, $absorbed] as $shelf) {
            if ($shelf->grouping === $grouping) {
                $keys = [...$keys, ...($shelf->group_keys ?? [])];
            }
        }

        return $keys === [] ? null : array_values(array_unique($keys));
    }

    public function addShelf(string $name): void
    {
        Bookshelf::create(['name' => $name, 'position' => (int) Bookshelf::max('position') + 1]);
    }

    public function placeOn(Book $book, ?int $bookshelfId): void
    {
        $this->withoutTouchingBooks(fn () => Book::query()->whereKey($book->id)->update(['bookshelf_id' => $bookshelfId]));
    }

    /** Books placed on the shelf by hand go back to the shelf that claims their group. */
    public function removeShelf(Bookshelf $bookshelf): void
    {
        DB::transaction(function () use ($bookshelf) {
            $this->withoutTouchingBooks(fn () => Book::query()->where('bookshelf_id', $bookshelf->id)->update(['bookshelf_id' => null]));
            $bookshelf->delete();
        });
    }

    /** `updated_at` versions the cover URL, so rearranging must not make every cover download again. */
    private function withoutTouchingBooks(callable $change): void
    {
        Book::withoutTimestamps($change);
    }
}
