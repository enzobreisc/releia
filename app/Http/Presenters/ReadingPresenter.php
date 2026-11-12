<?php

namespace App\Http\Presenters;

use App\Enums\ReadingStatus;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Services\ReadingService;

final class ReadingPresenter
{
    /**
     * Expects the book with its authors loaded.
     *
     * @return array<string, mixed>
     */
    public static function summary(Reading $reading, ReadingService $readings): array
    {
        $book = $reading->book;

        return [
            'reading_id' => $reading->id,
            'book_id' => $book->id,
            'title' => $book->title,
            'authors' => $book->authors->pluck('name')->implode(', '),
            'cover_url' => BookPresenter::coverUrl($book),
            ...$readings->progress($reading),
        ];
    }

    /**
     * Expects the sessions to be loaded.
     *
     * @return array<string, mixed>
     */
    public static function history(Reading $reading, int $number, ?int $bookPages): array
    {
        $sessions = $reading->sessions->sortByDesc(fn (ReadingSession $session) => [$session->read_on->toDateString(), $session->id]);
        $days = $reading->started_at !== null && $reading->finished_at !== null
            ? (int) $reading->started_at->diffInDays($reading->finished_at) + 1
            : null;
        $pages = $reading->status === ReadingStatus::Read ? $bookPages : $reading->current_page;

        return [
            'id' => $reading->id,
            'number' => $number,
            'status' => $reading->status->value,
            'status_label' => $reading->status->label(),
            'started_at' => $reading->started_at?->toDateString(),
            'finished_at' => $reading->finished_at?->toDateString(),
            'days' => $days,
            'current_page' => $reading->current_page,
            'pages_per_day' => $days !== null && $pages ? round($pages / $days, 1) : null,
            'rating' => $reading->rating,
            'review' => $reading->review,
            'abandon_reason' => $reading->abandon_reason,
            'sessions_count' => $sessions->count(),
            'first_session_on' => $sessions->last()?->read_on->toDateString(),
            'last_session_on' => $sessions->first()?->read_on->toDateString(),
            'sessions' => $sessions->map(self::session(...))->values()->all(),
        ];
    }

    /**
     * The hash is a display label derived from the id, styled like a commit hash.
     *
     * @return array<string, mixed>
     */
    public static function session(ReadingSession $session): array
    {
        return [
            'id' => $session->id,
            'hash' => substr(sha1((string) $session->id), 0, 7),
            'read_on' => $session->read_on->toDateString(),
            'page_from' => $session->page_from,
            'page_to' => $session->page_to,
            'pages' => $session->pages(),
            'minutes' => $session->minutes,
        ];
    }
}
