<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Presenters\QueuePresenter;
use App\Http\Requests\ReorderQueueRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\QueueService;
use App\Services\UndoService;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function __construct(private readonly QueueService $queue) {}

    /** Próximos a ler, com a previsão de término de cada um lendo na ordem da fila. */
    public function index(): Response
    {
        $pace = $this->queue->pace(Carbon::today());

        $queueItems = QueueItem::query()
            ->with(['book.authors', 'book.currentReading'])
            ->orderBy('position')
            ->get();

        $queuedBookIds = $queueItems->pluck('book_id');

        // Previsão de término de cada livro, lendo na ordem da fila a partir de hoje.
        $elapsed = 0;
        $queue = $queueItems->map(function (QueueItem $item) use ($pace, &$elapsed) {
            $days = $this->queue->estimateDays($item->book, $pace['pages_per_day']);
            $elapsed = $days === null || $elapsed === null ? null : $elapsed + $days;

            return QueuePresenter::queueItem($item, $days, $elapsed === null ? null : Carbon::today()->addDays($elapsed));
        })->values();

        return Inertia::render('queue', [
            'queue' => $queue,
            'pace' => [...$pace, 'queue_days' => $elapsed],
            'available' => Book::query()
                ->with('currentReading')
                ->whereNotIn('id', $queuedBookIds)
                ->whereHas('currentReading', fn ($query) => $query->where('status', ReadingStatus::WantToRead->value))
                ->orderBy('title')
                ->get(['id', 'title', 'pages'])
                ->map(fn (Book $book) => ['id' => $book->id, 'title' => $book->title])
                ->values(),
            'shopping_pending' => ShoppingItem::query()->whereNull('bought_at')->count(),
        ]);
    }

    /** Coloca um livro no fim da fila. */
    public function store(Request $request, UndoService $undo): RedirectResponse
    {
        $validated = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
        ]);

        $book = Book::query()->whereKey($validated['book_id'])->firstOrFail();
        $snapshot = $undo->capture([UndoService::scope('queue_items')]);
        $item = $this->queue->add($book);

        Toast::success(
            'Adicionado à fila',
            $book->title.' · entrou em '.Toast::ordinal($item->position),
            // Na própria Fila o link não faz sentido.
            str_contains(url()->previous(), '/queue')
                ? null
                : ['label' => 'Ver fila', 'method' => 'get', 'url' => route('queue.index', absolute: false)],
            $undo->remember($snapshot),
        );

        return back();
    }

    public function reorder(ReorderQueueRequest $request): RedirectResponse
    {
        $this->queue->reorder($request->ids());

        return back();
    }

    /** Tira da fila pelo livro (botão "na fila · 2º" do Detalhe e da Biblioteca). */
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

        Toast::success('Tirado da fila', $title.' · era o '.Toast::ordinal($position), null, $undo->remember($snapshot));

        return back();
    }
}
