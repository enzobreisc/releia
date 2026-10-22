<?php

namespace App\Services;

use App\Models\Book;
use App\Models\QueueItem;
use App\Models\Reading;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Queue of upcoming readings: order, days estimate and pace. */
class QueueService
{
    /** Pace used when no sessions have been logged yet. */
    public const DEFAULT_PAGES_PER_DAY = 20;

    /** Window, in days, to compute the pace from sessions. */
    private const PACE_WINDOW_DAYS = 30;

    /** A book already in the queue does not enter again: the call is idempotent. */
    public function add(Book $book): QueueItem
    {
        return DB::transaction(function () use ($book) {
            $existing = QueueItem::query()->where('book_id', $book->id)->first();

            if ($existing !== null) {
                return $existing;
            }

            return QueueItem::create([
                'book_id' => $book->id,
                'position' => (int) QueueItem::query()->max('position') + 1,
                'added_at' => now(),
            ]);
        });
    }

    /** Takes the book out of the queue, if it is in it (when starting to read, for instance). */
    public function removeBook(Book $book): void
    {
        $item = QueueItem::query()->where('book_id', $book->id)->first();

        if ($item !== null) {
            $this->remove($item);
        }
    }

    public function remove(QueueItem $item): void
    {
        DB::transaction(function () use ($item) {
            $item->delete();
            $this->compact();
        });
    }

    /**
     * Saves the new order. Receives the id of every queue item, in the desired order;
     * if the list does not match the current queue (another tab changed it), it refuses.
     *
     * @param  list<int>  $ids
     */
    public function reorder(array $ids): void
    {
        $current = QueueItem::query()->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
        $requested = $ids;
        sort($requested);

        if ($requested !== $current) {
            throw ValidationException::withMessages([
                'ids' => __('A fila mudou. Atualize a página e tente de novo.'),
            ]);
        }

        DB::transaction(function () use ($ids) {
            foreach ($ids as $position => $id) {
                QueueItem::query()->whereKey($id)->update(['position' => $position + 1]);
            }
        });
    }

    /** Renumbers positions as 1..n, with no gaps after a removal. */
    private function compact(): void
    {
        QueueItem::query()
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->values()
            ->each(function (QueueItem $item, int $index) {
                if ($item->position !== $index + 1) {
                    $item->update(['position' => $index + 1]);
                }
            });
    }

    /**
     * Pace in pages per day: average of the pages on the days you read,
     * within the last 30 days. Without sessions, it uses the default.
     *
     * @return array{pages_per_day: float, from_sessions: bool}
     */
    public function pace(Carbon $today): array
    {
        $from = $today->copy()->subDays(self::PACE_WINDOW_DAYS - 1)->toDateString();

        $pagesPerDay = DB::table('reading_sessions')
            ->selectRaw('date(read_on) as day, sum(page_to - page_from + 1) as pages')
            ->whereDate('read_on', '>=', $from)
            ->whereDate('read_on', '<=', $today->toDateString())
            ->groupBy('day')
            ->pluck('pages');

        if ($pagesPerDay->isEmpty()) {
            return ['pages_per_day' => (float) self::DEFAULT_PAGES_PER_DAY, 'from_sessions' => false];
        }

        return ['pages_per_day' => round((float) $pagesPerDay->avg(), 1), 'from_sessions' => true];
    }

    /**
     * Days to finish the book at the given pace. Null when the book has no page count.
     */
    public function estimateDays(Book $book, float $pagesPerDay): ?int
    {
        if ($book->pages === null || $pagesPerDay <= 0) {
            return null;
        }

        $reading = $book->currentReading;
        $currentPage = $reading instanceof Reading ? $reading->current_page : 0;
        $remaining = max(0, $book->pages - $currentPage);

        return (int) ceil($remaining / $pagesPerDay);
    }
}
