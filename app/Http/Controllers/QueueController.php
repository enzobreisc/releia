<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Enums\StoreType;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\QueuePresenter;
use App\Http\Requests\ReorderQueueRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\BookLookupService;
use App\Services\QueueService;
use App\Services\ShoppingService;
use App\Services\UndoService;
use App\Support\AmazonLink;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    /** Correspondências mostradas na busca da lista de compras. */
    private const MATCH_LIMIT = 5;

    public function __construct(private readonly QueueService $queue) {}

    /**
     * Próximos a ler, lista de compras (filtrada por loja) e total estimado dos itens pendentes.
     */
    public function index(Request $request, BookLookupService $lookup): Response
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

        // Previsão de término de cada livro, lendo na ordem da fila a partir de hoje.
        $elapsed = 0;
        $queue = $queueItems->map(function (QueueItem $item) use ($pace, &$elapsed) {
            $days = $this->queue->estimateDays($item->book, $pace['pages_per_day']);
            $elapsed = $days === null || $elapsed === null ? null : $elapsed + $days;

            return QueuePresenter::queueItem($item, $days, $elapsed === null ? null : Carbon::today()->addDays($elapsed));
        })->values();

        // Itens por comprar em cada loja, para as abas (sem o filtro atual).
        $storeCounts = ShoppingItem::query()
            ->whereNull('bought_at')
            ->selectRaw('store_type, count(*) as total')
            ->groupBy('store_type')
            ->pluck('total', 'store_type');

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
            'shopping' => $shopping->map(fn (ShoppingItem $item) => QueuePresenter::shoppingItem($item, $queuedBookIds))->values(),
            'stores' => array_map(fn (array $option) => [
                ...$option,
                'count' => (int) ($storeCounts[$option['value']] ?? 0),
            ], StoreType::options()),
            'filters' => ['store' => $store?->value],
            // "Ao comprar": vai para quero ler e também para a fila? Fica salvo.
            'queue_on_buy' => ShoppingService::queueOnBuy(),
            // Busca de correspondência (ISBN, título ou link da Amazon), só por recarga parcial.
            'matches' => Inertia::optional(fn () => $this->matches($request->string('match')->trim()->toString(), $lookup)),
            'totals' => [
                'pending_count' => $pending->count(),
                'pending_cents' => (int) $pending->sum('estimated_price_cents'),
            ],
        ]);
    }

    /**
     * Um link da Amazon vira o ISBN do ASIN; o resto vai para a busca normal
     * (ISBN exato ou título).
     *
     * @return array{query: string, isbn_from_url: string|null, items: list<array<string, mixed>>}
     */
    private function matches(string $query, BookLookupService $lookup): array
    {
        $isbn = AmazonLink::isbnFromUrl($query);
        // Um link sem ISBN (outra loja, produto sem ASIN de livro) não vira busca por título.
        $search = $isbn ?? (preg_match('~^https?://~i', $query) === 1 ? '' : $query);

        return [
            'query' => $query,
            'isbn_from_url' => $isbn,
            'items' => BookPresenter::candidates(array_slice($lookup->search($search), 0, self::MATCH_LIMIT)),
        ];
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
