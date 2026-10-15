<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Enums\StoreType;
use App\Http\Presenters\QueuePresenter;
use App\Http\Requests\ReorderQueueRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\QueueService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function __construct(private readonly QueueService $queue) {}

    /**
     * Próximos a ler, lista de compras (filtrada por loja) e total estimado dos itens pendentes.
     */
    public function index(Request $request): Response
    {
        $pace = $this->queue->pace(Carbon::today());
        $store = StoreType::tryFrom($request->string('store')->toString());

        $queueItems = QueueItem::query()
            ->with(['book.authors', 'book.currentReading'])
            ->orderBy('position')
            ->get();

        $queuedBookIds = $queueItems->pluck('book_id');

        $shopping = ShoppingItem::query()
            ->when($store, fn ($query, StoreType $store) => $query->where('store_type', $store->value))
            ->orderByRaw('bought_at IS NOT NULL')
            ->orderBy('id')
            ->get();

        $pending = $shopping->whereNull('bought_at');

        return Inertia::render('queue', [
            'queue' => $queueItems->map(fn (QueueItem $item) => QueuePresenter::queueItem(
                $item,
                $this->queue->estimateDays($item->book, $pace['pages_per_day']),
            ))->values(),
            'pace' => $pace,
            'available' => Book::query()
                ->with('currentReading')
                ->whereNotIn('id', $queuedBookIds)
                ->whereHas('currentReading', fn ($query) => $query->where('status', ReadingStatus::QueroLer->value))
                ->orderBy('title')
                ->get(['id', 'title', 'pages'])
                ->map(fn (Book $book) => ['id' => $book->id, 'title' => $book->title])
                ->values(),
            'shopping' => $shopping->map(fn (ShoppingItem $item) => QueuePresenter::shoppingItem($item, $queuedBookIds))->values(),
            'stores' => StoreType::options(),
            'filters' => ['store' => $store?->value],
            'totals' => [
                'pending_count' => $pending->count(),
                'pending_cents' => (int) $pending->sum('estimated_price_cents'),
            ],
        ]);
    }

    /** Coloca um livro no fim da fila. */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
        ]);

        $this->queue->add(Book::query()->whereKey($validated['book_id'])->firstOrFail());

        return back();
    }

    public function reorder(ReorderQueueRequest $request): RedirectResponse
    {
        $this->queue->reorder($request->ids());

        return back();
    }

    public function destroy(QueueItem $queueItem): RedirectResponse
    {
        $this->queue->remove($queueItem);

        return back();
    }
}
