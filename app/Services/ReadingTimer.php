<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Models\Setting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Timer for the day's reading (menu bar window). It lives in settings, not in the
 * window, so it keeps counting with the window closed or the app reopened.
 * There is only one timer at a time.
 *
 * @phpstan-type TimerState array{book_id: int, start_page: int, started_at: string, paused_at: string|null, paused_seconds: int}
 */
class ReadingTimer
{
    private const SETTING = 'reading_timer';

    public function __construct(private readonly ReadingService $readings) {}

    /**
     * @return TimerState|null
     */
    public function current(): ?array
    {
        $timer = Setting::get(self::SETTING);

        if (! is_array($timer) || ! isset($timer['book_id'], $timer['started_at'])) {
            return null;
        }

        /** @var TimerState $timer */
        return $timer;
    }

    /**
     * Starts counting. The starting page is the last one read; if it is higher than the
     * logged one, the book advances to it on save (pages read without being logged).
     */
    public function start(Book $book, int $startPage): void
    {
        $reading = $this->readings->readingFor($book);
        $pages = $book->pages;

        if ($startPage < $reading->current_page) {
            throw ValidationException::withMessages([
                'start_page' => __('Você já registrou até a pág. :page.', ['page' => $reading->current_page]),
            ]);
        }

        if ($pages !== null && $startPage >= $pages) {
            throw ValidationException::withMessages([
                'start_page' => __('O livro tem :pages páginas.', ['pages' => $pages]),
            ]);
        }

        if ($reading->status === ReadingStatus::WantToRead) {
            $this->readings->changeStatus($reading, ReadingStatus::Reading);
        }

        Setting::put(self::SETTING, [
            'book_id' => $book->id,
            'start_page' => $startPage,
            'started_at' => CarbonImmutable::now()->toIso8601String(),
            'paused_at' => null,
            'paused_seconds' => 0,
        ]);
    }

    public function pause(): void
    {
        $timer = $this->current();

        if ($timer !== null && $timer['paused_at'] === null) {
            Setting::put(self::SETTING, [...$timer, 'paused_at' => CarbonImmutable::now()->toIso8601String()]);
        }
    }

    public function resume(): void
    {
        $timer = $this->current();

        if ($timer !== null && $timer['paused_at'] !== null) {
            Setting::put(self::SETTING, [
                ...$timer,
                'paused_at' => null,
                'paused_seconds' => $timer['paused_seconds'] + $this->secondsSince($timer['paused_at']),
            ]);
        }
    }

    /**
     * Seconds read, without the pauses.
     *
     * @param  TimerState  $timer
     */
    public function elapsedSeconds(array $timer): int
    {
        $end = $timer['paused_at'] === null ? CarbonImmutable::now() : CarbonImmutable::parse($timer['paused_at']);
        $total = (int) CarbonImmutable::parse($timer['started_at'])->diffInSeconds($end, absolute: true);

        return max(0, $total - $timer['paused_seconds']);
    }

    /**
     * Stops the timer and logs today's session with the counted minutes
     * (at least 1). Without a timer, it does nothing.
     */
    public function finish(int $pageTo): ?ReadingSession
    {
        $timer = $this->current();

        if ($timer === null) {
            return null;
        }

        $book = Book::query()->findOrFail($timer['book_id']);
        $reading = $this->readings->readingFor($book);

        if ($pageTo <= $timer['start_page']) {
            throw ValidationException::withMessages([
                'page_to' => __('Informe uma página depois da pág. :page.', ['page' => $timer['start_page']]),
            ]);
        }

        $minutes = max(1, (int) round($this->elapsedSeconds($timer) / 60));

        // In a transaction: if the session is refused, the starting page is not kept.
        $session = DB::transaction(function () use ($reading, $timer, $pageTo, $minutes) {
            // Pages read before the timer, unlogged: the book advances up to the starting page.
            if ($timer['start_page'] > $reading->current_page) {
                $reading->current_page = $timer['start_page'];
                $reading->save();
            }

            return $this->readings->registerSession($reading, $pageTo, $minutes, Carbon::today());
        });

        $this->discard();

        return $session;
    }

    public function discard(): void
    {
        Setting::query()->whereKey(self::SETTING)->delete();
    }

    private function secondsSince(string $moment): int
    {
        return (int) CarbonImmutable::parse($moment)->diffInSeconds(CarbonImmutable::now(), absolute: true);
    }
}
