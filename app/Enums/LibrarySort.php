<?php

namespace App\Enums;

use App\Models\Book;
use Illuminate\Database\Eloquent\Builder;

enum LibrarySort: string
{
    case Recent = 'recent';
    case Title = 'title';
    case Rating = 'rating';

    /**
     * @param  Builder<Book>  $query
     * @return Builder<Book>
     */
    public function applyTo(Builder $query): Builder
    {
        return match ($this) {
            self::Recent => $query,
            self::Title => $query->orderByRaw('title COLLATE NOCASE'),
            self::Rating => $query->orderByRaw('current_rating IS NULL, current_rating DESC'),
        };
    }
}
