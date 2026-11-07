<?php

namespace App\Http\Presenters;

use App\Models\Book;
use App\Services\ReadingTimer;

/**
 * Shape of the running reading session sent to the pages.
 *
 * @phpstan-import-type TimerState from ReadingTimer
 */
final class LiveSessionPresenter
{
    /**
     * @param  TimerState  $timer
     * @return array{start_page: int, page: int, started_at: string, elapsed: int, paused: bool}
     */
    public static function timer(array $timer, ReadingTimer $readingTimer): array
    {
        return [
            'start_page' => $timer['start_page'],
            'page' => $timer['page'],
            'started_at' => $timer['started_at'],
            'elapsed' => $readingTimer->elapsedSeconds($timer),
            'paused' => $timer['paused_at'] !== null,
        ];
    }

    /**
     * The running session as a one-line summary, or null while nothing is being timed.
     *
     * @return array{title: string, timer: array{start_page: int, page: int, started_at: string, elapsed: int, paused: bool}}|null
     */
    public static function summary(ReadingTimer $readingTimer): ?array
    {
        $timer = $readingTimer->current();

        if ($timer === null) {
            return null;
        }

        return [
            'title' => Book::query()->findOrFail($timer['book_id'])->title,
            'timer' => self::timer($timer, $readingTimer),
        ];
    }
}
