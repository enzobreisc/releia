<?php

namespace App\Services\Recommendation;

use App\Enums\RecommendationStatus;
use App\Models\Author;
use App\Models\Book;
use App\Models\Recommendation;
use App\Support\BookIdentity;
use App\Support\Isbn;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

final class BlockedKeys
{
    /**
     * Keys of everything that must not come back as a suggestion: the collection, suggestions that did not
     * expire and the shopping list.
     *
     * @return array<string, true>
     */
    public function all(): array
    {
        $blocking = Recommendation::query()->where('status', '!=', RecommendationStatus::Expired);

        return array_fill_keys([...$this->libraryKeys(), ...$this->recommendationKeys($blocking), ...$this->shoppingKeys()], true);
    }

    /**
     * Keys of the suggestions that left the pending list unanswered, which may come back in small numbers.
     *
     * @return array<string, true>
     */
    public function expired(): array
    {
        $expired = Recommendation::query()->where('status', RecommendationStatus::Expired);

        return array_fill_keys($this->recommendationKeys($expired), true);
    }

    /** @return list<string> */
    public function libraryKeys(): array
    {
        return array_values(Book::query()->with('authors')->get()
            ->flatMap(fn (Book $book) => BookIdentity::keys(
                $book->title,
                array_values($book->authors->map(fn (Author $author) => $author->name)->all()),
                $book->isbn_13,
                $book->isbn_10,
            ))
            ->all());
    }

    /** @return list<string> */
    public function keysOf(Recommendation $recommendation): array
    {
        return BookIdentity::keys(
            $recommendation->title,
            AuthorNames::split($recommendation->author),
            $recommendation->isbn_13,
        );
    }

    /**
     * @param  Builder<Recommendation>  $recommendations
     * @return list<string>
     */
    private function recommendationKeys(Builder $recommendations): array
    {
        return array_values($recommendations->get()
            ->flatMap(fn (Recommendation $recommendation) => $this->keysOf($recommendation))
            ->all());
    }

    /**
     * Shopping list. Tolerant of a missing table or columns.
     * The queue (queue_items) does not count: it only holds books already in the collection.
     *
     * @return list<string>
     */
    private function shoppingKeys(): array
    {
        if (! Schema::hasTable('shopping_items')) {
            return [];
        }

        $columns = array_values(array_intersect(['title', 'author', 'isbn'], Schema::getColumnListing('shopping_items')));

        if (! in_array('title', $columns, true)) {
            return [];
        }

        $keys = [];

        foreach (DB::table('shopping_items')->get($columns) as $item) {
            $title = (string) $item->title;
            $author = isset($item->author) ? (string) $item->author : null;
            $isbn = isset($item->isbn) ? (string) $item->isbn : null;

            $keys = [...$keys, ...BookIdentity::keys($title, AuthorNames::split($author), $isbn !== null ? Isbn::toIsbn13($isbn) : null)];
        }

        return $keys;
    }
}
