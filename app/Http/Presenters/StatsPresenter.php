<?php

namespace App\Http\Presenters;

use App\Models\Reading;
use App\Support\DateLabel;

final class StatsPresenter
{
    /**
     * @return array<string, mixed>|null
     */
    public static function reading(?Reading $reading): ?array
    {
        if ($reading === null) {
            return null;
        }

        $book = $reading->book;
        $days = $reading->started_at !== null && $reading->finished_at !== null
            ? (int) $reading->started_at->diffInDays($reading->finished_at) + 1
            : null;

        return [
            'id' => $book->id,
            'title' => $book->title,
            'authors' => $book->authors->pluck('name')->implode(', '),
            'genre' => $book->genre,
            'cover_url' => BookPresenter::card($book)['cover_url'],
            'rating' => $reading->rating,
            'pages' => $book->pages,
            'days' => $days,
            'finished_at' => $reading->finished_at?->toDateString(),
        ];
    }

    public static function bucketLabel(string $key, bool $history): string
    {
        if ($history) {
            return $key;
        }

        return DateLabel::monthAbbreviation((int) substr($key, 5, 2));
    }

    public static function monthName(string $month): string
    {
        return DateLabel::monthName((int) substr($month, 5, 2));
    }
}
