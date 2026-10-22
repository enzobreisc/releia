<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Requests\UpdateReadingRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\Reading;
use App\Services\DashboardService;
use App\Services\ReadingService;
use App\Services\UndoService;
use App\Support\DateLabel;
use App\Support\Ordinal;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * @phpstan-import-type Snapshot from UndoService
 *
 * Shelf, rating, review and the lifecycle of each reading: start, finish,
 * abandon, reread, correct and change dates. Every change answers with a
 * notice, almost always with undo.
 */
class ReadingController extends Controller
{
    public function __construct(
        private readonly ReadingService $readings,
        private readonly UndoService $undo,
    ) {}

    /** Rating, review and simple shelf changes, on the book's most recent reading. */
    public function update(UpdateReadingRequest $request, Book $book): RedirectResponse
    {
        $reading = $book->currentReading;

        if ($reading === null) {
            $reading = new Reading(['status' => ReadingStatus::WantToRead]);
            $reading->book()->associate($book);
        }

        if ($request->has('rating')) {
            $reading->rating = $request->integer('rating') ?: null;
        }

        if ($request->has('review')) {
            $review = trim((string) $request->string('review'));
            $reading->review = $review === '' ? null : $review;
        }

        if (! $request->has('status')) {
            $reading->save();

            if ($request->has('review')) {
                Toast::success(__('Resenha salva'), $this->ordinalLabel($reading));
            } else {
                // The rating changes silently, but the previous undo is stale.
                $this->undo->forget();
            }

            return back();
        }

        $status = $request->enum('status', ReadingStatus::class) ?? $reading->status;
        $before = $reading->exists ? $reading->status : null;
        $snapshot = $this->captureBook($book);
        $wasQueued = QueueItem::query()->where('book_id', $book->id)->exists();

        $reading = $this->readings->changeStatus($reading, $status);
        $token = $this->undo->remember($snapshot);

        $this->statusToast($book, $reading, $before, $wasQueued, $token);

        return back();
    }

    /** "Start" from outside the detail page (queue, finish notice): moves to reading and opens the book. */
    public function start(Book $book): RedirectResponse
    {
        $snapshot = $this->captureBook($book);
        $wasQueued = QueueItem::query()->where('book_id', $book->id)->exists();
        $reading = $this->readings->readingFor($book);
        $before = $reading->status;

        $reading = $this->readings->changeStatus($reading, ReadingStatus::Reading);
        $this->statusToast($book, $reading, $before, $wasQueued, $this->undo->remember($snapshot));

        return to_route('books.show', $book);
    }

    /** Finish and rate: date (or undated), rating and a one-line review. */
    public function finish(Request $request, Reading $reading, DashboardService $dashboard): RedirectResponse
    {
        $data = $request->validate([
            'undated' => ['boolean'],
            'finished_on' => ['required_without:undated', 'nullable', 'date_format:Y-m-d'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'line' => ['nullable', 'string', 'max:280'],
        ]);

        $book = $reading->book;
        $snapshot = $this->captureBook($book);

        $this->readings->finish(
            $reading,
            ($data['undated'] ?? false) || empty($data['finished_on']) ? null : Carbon::createFromFormat('Y-m-d', $data['finished_on'])->startOfDay(),
            isset($data['rating']) ? (int) $data['rating'] : null,
            $data['line'] ?? null,
        );

        $goal = $dashboard->yearGoal(Carbon::today());
        $next = QueueItem::query()->with('book')->orderBy('position')->first()?->book;

        $sub = match (true) {
            $goal['goal'] !== null && $goal['finished'] === $goal['goal'] && $reading->finished_at?->year === $goal['year'] => __('Meta de :year batida: :finished de :goal', ['year' => $goal['year'], 'finished' => $goal['finished'], 'goal' => $goal['goal']]),
            $next !== null => __('próximo da fila: :title', ['title' => $next->title]),
            default => __('a fila está vazia'),
        };

        Toast::success(
            __(':title marcado como lido', ['title' => $book->title]),
            $sub,
            $next !== null
                ? ['label' => __('Começar :title', ['title' => $next->title]), 'method' => 'post', 'url' => route('books.start', $next, absolute: false)]
                : ['label' => __('Escolher o próximo'), 'method' => 'get', 'url' => route('queue.index', absolute: false)],
            $this->undo->remember($snapshot),
        );

        return back();
    }

    public function abandon(Request $request, Reading $reading): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:120'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
        ]);

        $snapshot = $this->captureBook($reading->book);
        $this->readings->abandon($reading, $data['reason'] ?? null, isset($data['rating']) ? (int) $data['rating'] : null);

        Toast::success(
            __('Abandonado na p. :page', ['page' => $reading->current_page]),
            $reading->abandon_reason === null ? __('sem motivo') : __('motivo: :reason', ['reason' => $reading->abandon_reason]),
            null,
            $this->undo->remember($snapshot),
        );

        return back();
    }

    /** Read again: today (reading) or later (want to read, at the end of the queue). */
    public function reread(Request $request, Book $book): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([ReadingStatus::Reading->value, ReadingStatus::WantToRead->value])],
        ]);

        $snapshot = $this->captureBook($book);
        $reading = $this->readings->startReread($book, ReadingStatus::from($data['status']));
        $token = $this->undo->remember($snapshot);

        $this->rereadToast($book, $reading, $token);

        return back();
    }

    /** Correct: unmarks as read and clears the finish date. */
    public function reopen(Reading $reading): RedirectResponse
    {
        $snapshot = $this->captureBook($reading->book);
        $this->readings->reopen($reading);

        Toast::success(
            __('Desmarcado como lido'),
            __('a leitura voltou para Lendo na p. :page', ['page' => $reading->current_page]),
            null,
            $this->undo->remember($snapshot),
        );

        return back();
    }

    public function dates(Request $request, Reading $reading): RedirectResponse
    {
        $data = $request->validate([
            'started_at' => ['nullable', 'date_format:Y-m-d'],
            'finished_at' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $snapshot = $this->undo->capture([UndoService::scope('readings', ['id' => $reading->id])]);

        $this->readings->updateDates(
            $reading,
            isset($data['started_at']) ? Carbon::createFromFormat('Y-m-d', $data['started_at'])->startOfDay() : null,
            isset($data['finished_at']) ? Carbon::createFromFormat('Y-m-d', $data['finished_at'])->startOfDay() : null,
        );

        $month = $reading->finished_at ?? $reading->started_at ?? Carbon::today();

        Toast::success(
            __('Datas salvas'),
            __('estatísticas de :month atualizadas', ['month' => DateLabel::monthYear($month)]),
            null,
            $this->undo->remember($snapshot),
        );

        return back();
    }

    /** Deletes a reading from the history (with its sessions). */
    public function destroy(Reading $reading): RedirectResponse
    {
        $book = $reading->book;
        $label = $this->ordinalLabel($reading);
        $snapshot = $this->undo->capture([
            UndoService::scope('readings', ['book_id' => $book->id]),
            UndoService::scope('reading_sessions', ['reading_id' => $reading->id]),
        ]);

        $this->readings->deleteReading($reading);

        Toast::success(__('Leitura apagada'), __(':reading de :title', ['reading' => $label, 'title' => $book->title]), null, $this->undo->remember($snapshot));

        return back();
    }

    /**
     * Snapshot of what a shelf change may touch: the book's readings (rereads
     * create a new one) and the whole queue (positions are reordered).
     *
     * @return Snapshot
     */
    private function captureBook(Book $book): array
    {
        return $this->undo->capture([
            UndoService::scope('readings', ['book_id' => $book->id]),
            UndoService::scope('queue_items'),
        ]);
    }

    private function statusToast(Book $book, Reading $reading, ?ReadingStatus $before, bool $wasQueued, string $token): void
    {
        $page = $reading->current_page;

        // Reread: changeStatus returned a new reading.
        if ($before === ReadingStatus::Read) {
            $this->rereadToast($book, $reading, $token);

            return;
        }

        match ($reading->status) {
            ReadingStatus::Reading => $before === ReadingStatus::Abandoned
                ? Toast::success(__('Leitura retomada'), __('continua da p. :page', ['page' => $page]), null, $token)
                : Toast::success(__('Começou a ler'), ($wasQueued ? __('saiu da fila').' · ' : '').__('início: :date', ['date' => DateLabel::shortDate($reading->started_at ?? Carbon::today())]), null, $token),
            ReadingStatus::WantToRead => Toast::success(
                __('Movido para Quero ler'),
                $this->keptPageNote($page),
                QueueItem::query()->where('book_id', $book->id)->exists()
                    ? null
                    : ['label' => __('Pôr na fila'), 'method' => 'post', 'url' => route('queue.store', absolute: false), 'data' => ['book_id' => $book->id]],
                $token,
            ),
            ReadingStatus::Read => Toast::success(__(':title marcado como lido', ['title' => $book->title]), null, null, $token),
            ReadingStatus::Abandoned => Toast::success(__('Abandonado na p. :page', ['page' => $page]), null, null, $token),
        };
    }

    private function keptPageNote(int $page): ?string
    {
        if ($page <= 0) {
            return null;
        }

        return __('a p. :page fica guardada; ao voltar, continua dela', ['page' => $page]);
    }

    private function rereadToast(Book $book, Reading $reading, string $token): void
    {
        if ($reading->status === ReadingStatus::Reading) {
            Toast::success(
                __(':ordinal leitura começou', ['ordinal' => Ordinal::feminine($this->readings->ordinal($reading))]),
                __('a anterior está na aba Leituras'),
                null,
                $token,
            );

            return;
        }

        Toast::success(
            __('Quero reler'),
            __('nova leitura · entrou em :position na fila · a anterior continua no histórico', ['position' => $this->queuePosition($book)]),
            null,
            $token,
        );
    }

    private function queuePosition(Book $book): string
    {
        $position = QueueItem::query()->where('book_id', $book->id)->value('position');

        return Ordinal::masculine((int) $position);
    }

    private function ordinalLabel(Reading $reading): string
    {
        return __(':ordinal leitura', ['ordinal' => Ordinal::feminine($reading->exists ? $this->readings->ordinal($reading) : 1)]);
    }
}
