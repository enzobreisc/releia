<?php

namespace App\Enums;

use App\Models\Book;
use App\Support\PublisherKey;
use App\Support\ShelfGroup;

enum ShelfGrouping: string
{
    case Publisher = 'publisher';
    case Author = 'author';
    case Genre = 'genre';
    case Series = 'series';

    public function label(): string
    {
        return match ($this) {
            self::Publisher => __('Editora'),
            self::Author => __('Autor'),
            self::Genre => __('Gênero'),
            self::Series => __('Série'),
        };
    }

    /** Null when the book has no value for this grouping, such as a book outside any series. */
    public function groupOf(Book $book): ?ShelfGroup
    {
        $label = trim((string) match ($this) {
            self::Publisher => $book->publisher,
            self::Author => $book->authors->first()?->name,
            self::Genre => $book->genre,
            self::Series => $book->series,
        });

        $key = $this === self::Publisher ? PublisherKey::of($label) : Book::normalizeSearch($label);

        return $key === '' ? null : new ShelfGroup($key, $label);
    }
}
