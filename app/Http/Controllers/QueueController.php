<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Presenters\QueuePresenter;
use App\Http\Requests\ReorderQueueRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\QueueService;
use App\Services\ReadingService;
use App\Services\UndoService;
use App\Support\Ordinal;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function __construct(
        private readonly QueueService $queue,
        private readonly ReadingService $readings,
    ) {}

    /** Up next, with each book's finish forecast reading in queue order. */
    public function index(): Response
    {
        $pace = $this->queue->pace(Carbon::today());

        $queueItems = QueueItem::query()
            ->with(['book.authors', 'book.currentReading'])
            ->orderBy('position')
            ->get();

        $queuedBookIds = $queueItems->pluck('book_id');

        // Finish forecast for each book, reading in queue order starting today.
        $elapsed = 0;
        $queue = $queueItems->map(function (QueueItem $item) use ($pace, &$elapsed) {
            $days = $this->queue->estimateDays($item->book, $pace['pages_per_day']);
            $elapsed = $days === null || $elapsed === null ? null : $elapsed + $days;

            return QueuePresenter::queueItem($item, $days, $elapsed === null ? null : Carbon::today()->addDays($elapsed));
        })->values();

        return Inertia::render('queue', [
            'queue' => $queue,
            'pace' => [...$pace, 'queue_days' => $elapsed],
            'available' => $this->findQueueCandidates($queuedBookIds),
            'shopping_pending' => ShoppingItem::query()->whereNull('bought_at')->count(),
        ]);
    }

    /** Puts a book at the end of the queue. */
    public function store(Request $request, UndoService $undo): RedirectResponse
    {
        $validated = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
        ]);

        $book = Book::query()->whereKey($validated['book_id'])->firstOrFail();
        $snapshot = $undo->capture([
            UndoService::scope('readings', ['book_id' => $book->id]),
            UndoService::scope('queue_items'),
        ]);
        $item = $this->enqueue($book);

        Toast::success(
            __('Adicionado à fila'),
            $book->title.' · '.__('entrou em :position', ['position' => Ordinal::masculine($item->position)]),
            // On the Queue screen itself the link makes no sense.
            str_contains(url()->previous(), '/queue')
                ? null
                : ['label' => __('Ver fila'), 'method' => 'get', 'url' => route('queue.index', absolute: false)],
            $undo->remember($snapshot),
        );

        return back();
    }

    public function reorder(ReorderQueueRequest $request): RedirectResponse
    {
        $this->queue->reorder($request->ids());

        return back();
    }

    /** Removes from the queue by book (the "in queue · 2nd" button on the detail page and Library). */
    public function destroyBook(Book $book, UndoService $undo): RedirectResponse
    {
        return $this->destroy(QueueItem::query()->where('book_id', $book->id)->firstOrFail(), $undo);
    }

    public function destroy(QueueItem $queueItem, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([UndoService::scope('queue_items')]);
        $title = $queueItem->book->title;
        $position = $queueItem->position;

        $this->queue->remove($queueItem);

        Toast::success(__('Tirado da fila'), $title.' · '.__('era o :position', ['position' => Ordinal::masculine($position)]), null, $undo->remember($snapshot));

        return back();
    }

    /** A finished book enters the queue as a reread, with a new want-to-read reading. */
    private function enqueue(Book $book): QueueItem
    {
        if ($book->currentReading?->status === ReadingStatus::Read) {
            $this->readings->startReread($book, ReadingStatus::WantToRead);
        }

        return $this->queue->add($book);
    }

    /**
     * Books that can join the queue: on the want-to-read shelf or finished, to reread.
     *
     * @param  Collection<int, int>  $queuedBookIds
     * @return Collection<int, array{id: int, title: string, is_reread: bool}>
     */
    private function findQueueCandidates(Collection $queuedBookIds): Collection
    {
        return Book::query()
            ->with('currentReading')
            ->whereNotIn('id', $queuedBookIds)
            ->whereHas('currentReading', fn ($query) => $query->whereIn('status', [
                ReadingStatus::WantToRead->value,
                ReadingStatus::Read->value,
            ]))
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn (Book $book) => QueuePresenter::candidate($book))
            ->values();
    }
}
