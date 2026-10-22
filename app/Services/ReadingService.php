<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Support\DateLabel;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reading rules: the start and end dates follow the shelf, because statistics
 * count books read by their end date. Sessions keep current_page consistent
 * with what was logged.
 */
class ReadingService
{
    public function __construct(private readonly QueueService $queue) {}

    /**
     * Changes the reading's shelf. Start, page and sessions are never erased here:
     * going back to "want to read" is a pause, and resuming continues where it stopped.
     *
     * A read book does not go back to "reading" or "want to read" in the same reading:
     * that becomes a reread (startReread). Fixing a wrong mark is reopen().
     */
    public function changeStatus(Reading $reading, ReadingStatus $status): Reading
    {
        if ($reading->status === $status && $reading->exists) {
            return $reading;
        }

        if ($reading->exists && $reading->status === ReadingStatus::Read) {
            if ($status === ReadingStatus::Abandoned) {
                throw ValidationException::withMessages([
                    'status' => __('Um livro lido não pode ser abandonado. Para relê-lo, use "Ler de novo".'),
                ]);
            }

            return $this->startReread($reading->book, $status);
        }

        $today = Carbon::today();
        $reading->status = $status;

        switch ($status) {
            case ReadingStatus::WantToRead:
                $reading->finished_at = null;
                $reading->abandon_reason = null;
                break;

            case ReadingStatus::Reading:
                $reading->started_at ??= $today;
                $reading->finished_at = null;
                $reading->abandon_reason = null;
                break;

            case ReadingStatus::Read:
                $reading->started_at ??= $today;
                $reading->finished_at = $today;
                $reading->current_page = max($reading->current_page, $reading->book->pages ?? 0);
                $reading->abandon_reason = null;
                break;

            case ReadingStatus::Abandoned:
                $reading->started_at ??= $today;
                $reading->finished_at = $today;
                break;
        }

        $reading->save();

        // The queue holds what comes next: starting, finishing or abandoning takes the book out of it.
        if ($status !== ReadingStatus::WantToRead) {
            $this->queue->removeBook($reading->book);
        }

        return $reading;
    }

    /**
     * Finishes the reading on a chosen date, with an optional rating and one-line review.
     * The line goes at the top of any existing review. Without a date (`$on` null) the book
     * is read but left out of period statistics: it is for what was read long ago.
     */
    public function finish(Reading $reading, ?Carbon $on, ?int $rating = null, ?string $line = null): Reading
    {
        if ($reading->status === ReadingStatus::Read) {
            throw ValidationException::withMessages(['status' => __('Esta leitura já está terminada.')]);
        }

        if ($on !== null) {
            $this->ensureEndDate($reading, $on, 'finished_on');
        }

        DB::transaction(function () use ($reading, $on, $rating, $line) {
            $first = $reading->sessions()->min('read_on');

            $reading->started_at ??= $first === null ? $on : Carbon::parse($first);
            $reading->status = ReadingStatus::Read;
            $reading->finished_at = $on;
            $reading->current_page = max($reading->current_page, $reading->book->pages ?? 0);
            $reading->abandon_reason = null;

            if ($rating !== null) {
                $reading->rating = $rating;
            }

            $line = $line === null ? '' : trim($line);

            if ($line !== '') {
                $reading->review = $reading->review === null ? $line : $line."\n\n".$reading->review;
            }

            $reading->save();
            $this->queue->removeBook($reading->book);
        });

        return $reading;
    }

    /** Abandons, keeping the page and, when given, the reason. */
    public function abandon(Reading $reading, ?string $reason = null, ?int $rating = null): Reading
    {
        if ($reading->status === ReadingStatus::Read) {
            throw ValidationException::withMessages([
                'status' => __('Um livro lido não pode ser abandonado. Para relê-lo, use "Ler de novo".'),
            ]);
        }

        return DB::transaction(function () use ($reading, $reason, $rating) {
            $this->changeStatus($reading, ReadingStatus::Abandoned);

            $reason = $reason === null ? '' : trim($reason);
            $reading->abandon_reason = $reason === '' ? null : $reason;

            if ($rating !== null) {
                $reading->rating = $rating;
            }

            $reading->save();

            return $reading;
        });
    }

    /**
     * Reread: a new reading of the book, with its own sessions, rating and review.
     * The previous one stays intact in the history. "Want to read" goes to the end of the queue.
     */
    public function startReread(Book $book, ReadingStatus $status): Reading
    {
        if (! in_array($status, [ReadingStatus::Reading, ReadingStatus::WantToRead], true)) {
            throw ValidationException::withMessages(['status' => __('Uma releitura começa em "lendo" ou "quero ler".')]);
        }

        if ($book->currentReading?->status !== ReadingStatus::Read) {
            throw ValidationException::withMessages(['status' => __('Só dá para reler um livro que você terminou.')]);
        }

        return DB::transaction(function () use ($book, $status) {
            $reading = new Reading([
                'status' => $status,
                'started_at' => $status === ReadingStatus::Reading ? Carbon::today() : null,
            ]);
            $reading->book()->associate($book);
            $reading->save();

            $book->unsetRelation('currentReading');

            if ($status === ReadingStatus::WantToRead) {
                $this->queue->add($book);
            } else {
                $this->queue->removeBook($book);
            }

            return $reading;
        });
    }

    /**
     * "Fix: I have not finished yet". The only path that clears the end date
     * of a read reading: it goes back to "reading" on the page it was on.
     */
    public function reopen(Reading $reading): Reading
    {
        if ($reading->status !== ReadingStatus::Read) {
            throw ValidationException::withMessages(['status' => __('Só uma leitura terminada pode ser desmarcada.')]);
        }

        $reading->status = ReadingStatus::Reading;
        $reading->finished_at = null;
        $reading->save();

        return $reading;
    }

    /**
     * Fixes the dates. Finished or abandoned readings have a start and an end;
     * ongoing ones, only a start. A read reading may have no dates (read long ago).
     * Sessions outside the period are allowed: the screen warns about it.
     */
    public function updateDates(Reading $reading, ?Carbon $start, ?Carbon $end): void
    {
        $closed = in_array($reading->status, [ReadingStatus::Read, ReadingStatus::Abandoned], true);

        if ($reading->status === ReadingStatus::Read && $end === null) {
            $reading->started_at = $start;
            $reading->finished_at = null;
            $reading->save();

            return;
        }

        if ($start === null) {
            throw ValidationException::withMessages(['started_at' => __('Informe o início.')]);
        }

        if ($start->greaterThan(Carbon::today())) {
            throw ValidationException::withMessages(['started_at' => __('O início não pode ser depois de hoje.')]);
        }

        if ($closed) {
            if ($end === null) {
                throw ValidationException::withMessages(['finished_at' => __('Informe o término.')]);
            }

            if ($end->lessThan($start)) {
                throw ValidationException::withMessages(['finished_at' => __('O término não pode ser antes do início.')]);
            }

            $this->ensureEndDate($reading, $end, 'finished_at');
        }

        $reading->started_at = $start;
        $reading->finished_at = $closed ? $end : null;
        $reading->save();
    }

    /** Deletes a reading from the history. A book's only reading stays: remove the book instead. */
    public function deleteReading(Reading $reading): void
    {
        if ($reading->book->readings()->count() <= 1) {
            throw ValidationException::withMessages([
                'reading' => __('Esta é a única leitura do livro. Para apagá-la, remova o livro da biblioteca.'),
            ]);
        }

        $reading->delete();
    }

    /** Position of the reading among the book's readings: 1 for the first, 2 for the reread... */
    public function ordinal(Reading $reading): int
    {
        return Reading::query()
            ->where('book_id', $reading->book_id)
            ->where('id', '<=', $reading->id)
            ->count();
    }

    /** The book's most recent reading; creates a "want to read" one when there is none. */
    public function readingFor(Book $book): Reading
    {
        $reading = $book->currentReading;

        if ($reading === null) {
            $reading = new Reading(['status' => ReadingStatus::WantToRead]);
            $reading->book()->associate($book);
            // Saved right away: the session needs a reading with an id.
            $reading->save();
        }

        return $reading;
    }

    /**
     * Logs what was read: the page where the reader stopped, with optional minutes.
     * The starting page is derived from current_page + 1. It only moves forward: to
     * fix a record, edit the session.
     *
     * Sessions only go into "want to read" or "reading" books (the former becomes
     * "reading" on its own). Read or abandoned books must go back to "reading"
     * first, so a reading is not reopened by accident.
     */
    public function registerSession(Reading $reading, int $pageTo, ?int $minutes, Carbon $readOn): ReadingSession
    {
        if (! in_array($reading->status, [ReadingStatus::WantToRead, ReadingStatus::Reading], true)) {
            throw ValidationException::withMessages([
                'status' => __('Mude a estante para "Lendo" para registrar sessões.'),
            ]);
        }

        $this->ensureWithinBook($reading, $pageTo);

        if ($pageTo <= $reading->current_page) {
            throw ValidationException::withMessages([
                'page_to' => __('Informe uma página depois da pág. :page.', ['page' => $reading->current_page]),
            ]);
        }

        return DB::transaction(function () use ($reading, $pageTo, $minutes, $readOn) {
            $session = $reading->sessions()->create([
                'read_on' => $readOn->toDateString(),
                'page_from' => $reading->current_page + 1,
                'page_to' => $pageTo,
                'minutes' => $minutes,
            ]);

            $reading->current_page = $pageTo;

            // changeStatus already saves the reading; without a shelf change, save it here.
            if ($reading->status === ReadingStatus::WantToRead) {
                $this->changeStatus($reading, ReadingStatus::Reading);
            } else {
                $reading->save();
            }

            return $session;
        });
    }

    /**
     * Fixes a session. The starting page stays as logged, because the
     * following sessions continue from it.
     */
    public function updateSession(ReadingSession $session, Carbon $readOn, int $pageTo, ?int $minutes): void
    {
        $reading = $session->reading;

        if ($pageTo < $session->page_from) {
            throw ValidationException::withMessages([
                'page_to' => __('Use uma página a partir da :page.', ['page' => $session->page_from]),
            ]);
        }

        $this->ensureWithinBook($reading, $pageTo);

        DB::transaction(function () use ($session, $reading, $readOn, $pageTo, $minutes) {
            $wasLast = $session->page_to === $reading->current_page;

            $session->update([
                'read_on' => $readOn->toDateString(),
                'page_to' => $pageTo,
                'minutes' => $minutes,
            ]);

            if ($wasLast) {
                $this->syncCurrentPage($reading);
            }
        });
    }

    /**
     * Deletes a session. current_page only goes back if the deleted session was the last
     * one logged. A manual mark (e.g. "read") is not undone by this.
     */
    public function deleteSession(ReadingSession $session): void
    {
        $reading = $session->reading;
        $wasLast = $session->page_to === $reading->current_page;

        DB::transaction(function () use ($session, $reading, $wasLast) {
            $session->delete();

            if ($wasLast) {
                $this->syncCurrentPage($reading);
            }
        });
    }

    /**
     * Progress for the screens: page, percentage, pace and days forecast.
     *
     * Pace is pages per day with reading, the same criterion as the statistics'
     * average over reading days. Without sessions there is no forecast.
     *
     * @return array{current_page: int, pages: int|null, percent: int|null, pace: float|null, days_left: int|null, finish_suggested: bool}
     */
    public function progress(Reading $reading): array
    {
        $pages = $reading->book->pages;
        $current = $reading->current_page;

        $totals = $reading->sessions()
            ->toBase()
            ->selectRaw('count(distinct date(read_on)) as days, sum(page_to - page_from + 1) as pages_read')
            ->first();

        $days = (int) ($totals->days ?? 0);
        $pace = $days > 0 ? (int) ($totals->pages_read ?? 0) / $days : null;
        $remaining = $pages === null ? null : $pages - $current;

        return [
            'current_page' => $current,
            'pages' => $pages,
            'percent' => $pages !== null && $pages > 0 ? min(100, (int) round($current / $pages * 100)) : null,
            'pace' => $pace === null ? null : round($pace, 1),
            'days_left' => $remaining !== null && $remaining > 0 && $pace !== null && $pace > 0
                ? (int) ceil($remaining / $pace)
                : null,
            // Reached the last page: the screen offers to mark it as read, without changing anything on its own.
            'finish_suggested' => $reading->status === ReadingStatus::Reading && $pages !== null && $current >= $pages,
        ];
    }

    /**
     * Valid end date: not after today, not before the start nor the last session.
     */
    private function ensureEndDate(Reading $reading, Carbon $end, string $field): void
    {
        if ($end->greaterThan(Carbon::today())) {
            throw ValidationException::withMessages([$field => __('O término não pode ser depois de hoje.')]);
        }

        if ($reading->started_at !== null && $end->lessThan($reading->started_at) && $field === 'finished_on') {
            throw ValidationException::withMessages([
                $field => __('A leitura começou em :date. Escolha essa data ou depois.', ['date' => DateLabel::shortDate($reading->started_at)]),
            ]);
        }

        $last = $reading->sessions()->max('read_on');

        if ($last !== null && $end->lessThan(Carbon::parse($last)->startOfDay())) {
            throw ValidationException::withMessages([
                $field => __('A última sessão foi em :date. Escolha essa data ou depois.', ['date' => DateLabel::shortDate(Carbon::parse($last))]),
            ]);
        }
    }

    private function ensureWithinBook(Reading $reading, int $pageTo): void
    {
        $pages = $reading->book->pages;

        if ($pages !== null && $pageTo > $pages) {
            throw ValidationException::withMessages([
                'page_to' => __('O livro tem :pages páginas.', ['pages' => $pages]),
            ]);
        }
    }

    /** Recomputes current_page from the highest logged page, when sessions remain. */
    private function syncCurrentPage(Reading $reading): void
    {
        $last = $reading->sessions()->max('page_to');

        if ($last !== null) {
            $reading->current_page = (int) $last;
            $reading->save();
        }
    }
}
