<?php

namespace App\Http\Presenters;

use App\Services\TimelineEntry;

final class TimelinePresenter
{
    /**
     * @return array{id: int, book_id: int, title: string, authors: string, cover_url: string|null, status: string, is_reread: bool, started_at: string, finished_at: string|null}
     */
    public static function entry(TimelineEntry $entry): array
    {
        $reading = $entry->reading;

        return [
            'id' => $reading->id,
            'book_id' => $reading->book_id,
            'title' => $reading->book->title,
            'authors' => $reading->book->authors->pluck('name')->implode(', '),
            'cover_url' => BookPresenter::coverUrl($reading->book),
            'status' => $reading->status->value,
            'is_reread' => $entry->isReread,
            'started_at' => $entry->startedOn->toDateString(),
            'finished_at' => $entry->endedOn?->toDateString(),
        ];
    }
}
