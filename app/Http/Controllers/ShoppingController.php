<?php

namespace App\Http\Controllers;

use App\Enums\StoreType;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\QueuePresenter;
use App\Http\Requests\ShoppingItemRequest;
use App\Http\Requests\ShoppingPriceRequest;
use App\Http\Requests\ShoppingSelectionRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\BookLookupService;
use App\Services\ShoppingService;
use App\Services\UndoService;
use App\Support\AmazonLink;
use App\Support\Money;
use App\Support\Ordinal;
use App\Support\StoreLinks;
use App\Support\Toast;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Native\Desktop\Facades\Shell;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ShoppingController extends Controller
{
    /** Takes the book off the "want to read" shelf and moves it to the shopping list. */
    public function fromBook(Book $book): RedirectResponse
    {
        $title = $book->title;

        if ($this->shopping->fromWishlist($book) === null) {
            Toast::error(__(':title não pode ir para as compras', ['title' => $title]), __('só livros em "quero ler", sem leitura iniciada'));

            return back();
        }

        Toast::success(__(':title foi para as compras', ['title' => $title]), __('saiu de "quero ler"'));

        return to_route('shopping.index');
    }

    /** Matches shown in the shopping list search. */
    private const MATCH_LIMIT = 5;

    public function __construct(private readonly ShoppingService $shopping) {}

    /** Shopping list (filtered by store) and estimated total of pending items. */
    public function index(Request $request, BookLookupService $lookup): Response
    {
        $store = StoreType::tryFrom($request->string('store')->toString());
        $search = $request->string('q')->trim()->toString();
        $sort = $request->string('sort')->toString();

        $shopping = ShoppingItem::query()
            ->when($store, fn ($query, StoreType $store) => $query->where('store_type', $store->value))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $query->where('title', 'like', $like)->orWhere('author', 'like', $like);
            }))
            ->orderByRaw('bought_at IS NOT NULL')
            ->orderByDesc('is_priority')
            ->when($sort === 'price_asc', fn ($query) => $query->orderByRaw('estimated_price_cents IS NULL')->orderBy('estimated_price_cents'))
            ->when($sort === 'price_desc', fn ($query) => $query->orderByRaw('estimated_price_cents IS NULL')->orderByDesc('estimated_price_cents'))
            ->when($sort === 'title', fn ($query) => $query->orderBy('title'))
            ->when($sort === 'recent', fn ($query) => $query->orderByDesc('id'))
            ->orderBy('id')
            ->get();

        $pending = $shopping->whereNull('bought_at');
        $queuedBookIds = QueueItem::query()->pluck('book_id');

        // Items to buy in each store, for the tabs (without the current filter).
        $storeCounts = ShoppingItem::query()
            ->whereNull('bought_at')
            ->selectRaw('store_type, count(*) as total')
            ->groupBy('store_type')
            ->pluck('total', 'store_type');

        return Inertia::render('shopping', [
            'shopping' => $shopping->map(fn (ShoppingItem $item) => QueuePresenter::shoppingItem($item, $queuedBookIds))->values(),
            'stores' => array_map(fn (array $option) => [
                ...$option,
                'count' => (int) ($storeCounts[$option['value']] ?? 0),
            ], StoreType::options()),
            'filters' => [
                'store' => $store?->value,
                'q' => $search !== '' ? $search : null,
                'sort' => in_array($sort, ['price_asc', 'price_desc', 'title', 'recent'], true) ? $sort : null,
            ],
            // "On buy": does it go to want to read and also to the queue? It is saved.
            'queue_on_buy' => ShoppingService::queueOnBuy(),
            // Match search (ISBN, title or Amazon link), only via partial reload.
            'matches' => Inertia::optional(fn () => $this->matches($request->string('match')->trim()->toString(), $lookup)),
            'totals' => [
                'pending_count' => $pending->count(),
                'pending_cents' => (int) $pending->sum('estimated_price_cents'),
            ],
            'queue_count' => $queuedBookIds->count(),
        ]);
    }

    /**
     * An Amazon link becomes the ISBN from the ASIN; the rest goes to the normal search
     * (exact ISBN or title).
     *
     * @return array{query: string, isbn_from_url: string|null, items: list<array<string, mixed>>}
     */
    private function matches(string $query, BookLookupService $lookup): array
    {
        $isbn = AmazonLink::isbnFromUrl($query);
        // A link without an ISBN (another store, product without a book ASIN) does not become a title search.
        $search = $isbn ?? (preg_match('~^https?://~i', $query) === 1 ? '' : $query);

        return [
            'query' => $query,
            'isbn_from_url' => $isbn,
            'items' => BookPresenter::candidates(array_slice($lookup->search($search), 0, self::MATCH_LIMIT)),
        ];
    }

    public function store(ShoppingItemRequest $request): RedirectResponse
    {
        $item = $this->shopping->add($request->payload());

        Toast::success(__('Adicionado à lista de compras'), $item->title);

        return back();
    }

    public function update(ShoppingPriceRequest $request, ShoppingItem $shoppingItem): RedirectResponse
    {
        $this->shopping->updatePrice($shoppingItem, $request->cents());

        Toast::success(__('Preço atualizado'), $shoppingItem->title);

        return back();
    }

    /** "Look up price": the edition's lowest price on Estante Virtual, with undo. */
    public function lookupPrice(ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        if ($shoppingItem->isbn === null) {
            Toast::error(__('Sem ISBN não dá para buscar o preço'), __('Anote o preço à mão.'));

            return back();
        }

        $snapshot = $undo->capture([UndoService::scope('shopping_items', ['id' => $shoppingItem->id])]);
        $cents = $this->shopping->lookupPrice($shoppingItem);

        if ($cents === null) {
            Toast::error(__('Não achei o preço dessa edição'), __('Não está à venda na Estante Virtual, ou o site não respondeu. Anote à mão.'));

            return back();
        }

        Toast::success(
            __('A partir de :price', ['price' => Money::format($cents)]),
            $shoppingItem->title.' · '.__('menor preço na Estante Virtual (inclui usados)'),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /**
     * Opens the purchase link in the default browser. The native window does not
     * open new tabs, so the request goes through NativePHP's Shell.
     */
    public function open(Request $request, ShoppingItem $shoppingItem): RedirectResponse|SymfonyResponse
    {
        $data = $request->validate(['store' => ['nullable', Rule::in(StoreLinks::keys())]]);
        $url = $shoppingItem->shopUrl($data['store'] ?? null);

        if (! config('nativephp-internal.running')) {
            return Inertia::location($url);
        }

        Shell::openExternal($url);

        return back();
    }

    public function destroy(ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([UndoService::scope('shopping_items', ['id' => $shoppingItem->id])]);
        $shoppingItem->delete();

        Toast::success(__('Item excluído'), $shoppingItem->title.$this->priceSuffix($shoppingItem), null, $undo->remember($snapshot));

        return back();
    }

    /** Buys the item: creates the book in the library and, per the saved preference, queues it. */
    public function buy(Request $request, ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        $queue = $request->has('queue') ? $request->boolean('queue') : ShoppingService::queueOnBuy();
        $snapshot = $undo->capture([
            UndoService::scope('shopping_items', ['id' => $shoppingItem->id]),
            UndoService::scope('queue_items'),
        ]);

        $this->shopping->buy($shoppingItem, $queue);
        $shoppingItem->refresh();

        // Undo restores the item as not bought, but keeps the link to the book already created.
        $snapshot = $undo->override($snapshot, 'shopping_items', ['book_id' => $shoppingItem->book_id]);
        $position = $shoppingItem->book_id === null ? null : QueueItem::query()->where('book_id', $shoppingItem->book_id)->value('position');

        Toast::success(
            __('Comprado'),
            $shoppingItem->title.' · '.($queue && $position !== null
                ? __('foi para quero ler e entrou em :position na fila', ['position' => Ordinal::masculine((int) $position)])
                : __('foi para quero ler')),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /** Buys the selected items at once, following the saved queue preference, with a single undo. */
    public function buyMany(ShoppingSelectionRequest $request, UndoService $undo): RedirectResponse
    {
        $items = $request->shoppingItems()->whereNull('bought_at')->values();

        if ($items->isEmpty()) {
            return back();
        }

        $queue = ShoppingService::queueOnBuy();
        $snapshot = $undo->capture([...$this->itemScopes($items), UndoService::scope('queue_items')]);

        $this->shopping->buyMany($items, $queue);

        // Undo restores the items as not bought, but keeps the links to the books already created.
        foreach ($items as $item) {
            $snapshot = $undo->override($snapshot, 'shopping_items', ['book_id' => $item->book_id], ['id' => $item->id]);
        }

        Toast::success(
            $items->count() === 1 ? __('Comprado') : __(':count livros comprados', ['count' => $items->count()]),
            $items->pluck('title')->implode(', ').' · '.($queue ? __('em quero ler e na fila') : __('em quero ler')),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    public function destroyMany(ShoppingSelectionRequest $request, UndoService $undo): RedirectResponse
    {
        $items = $request->shoppingItems();
        $snapshot = $undo->capture($this->itemScopes($items));

        $items->each->delete();

        Toast::success(
            $items->count() === 1 ? __('Item excluído') : __(':count itens excluídos', ['count' => $items->count()]),
            $items->pluck('title')->implode(', '),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /** Marks the item as one to buy now, or moves it back to the wishlist. */
    public function priority(Request $request, ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        $data = $request->validate(['is_priority' => ['required', 'boolean']]);

        $shoppingItem->update(['is_priority' => (bool) $data['is_priority']]);
        // No notice here, so the previous undo must end: its snapshot could revert the star.
        $undo->forget();

        return back();
    }

    /** Unmarks the purchase. */
    public function unbuy(ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([
            UndoService::scope('shopping_items', ['id' => $shoppingItem->id]),
            UndoService::scope('queue_items'),
        ]);

        $wasQueued = $shoppingItem->book_id !== null && QueueItem::query()->where('book_id', $shoppingItem->book_id)->exists();
        $this->shopping->unbuy($shoppingItem);
        $stillQueued = $shoppingItem->book_id !== null && QueueItem::query()->where('book_id', $shoppingItem->book_id)->exists();

        Toast::success(
            __('Desmarcado como comprado'),
            $shoppingItem->title.($wasQueued && ! $stillQueued ? ' · '.__('saiu da fila') : ''),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /** "On buy" preference: just want to read, or want to read plus queue. */
    public function preference(Request $request): RedirectResponse
    {
        $data = $request->validate(['queue_on_buy' => ['required', 'boolean']]);

        ShoppingService::setQueueOnBuy((bool) $data['queue_on_buy']);

        return back();
    }

    /**
     * @param  Collection<int, ShoppingItem>  $items
     * @return list<array{table: string, where: array<string, mixed>, key: string|null}>
     */
    private function itemScopes(Collection $items): array
    {
        return array_values($items->map(fn (ShoppingItem $item) => UndoService::scope('shopping_items', ['id' => $item->id]))->all());
    }

    private function priceSuffix(ShoppingItem $item): string
    {
        return $item->estimated_price_cents === null ? '' : ' · '.Money::format($item->estimated_price_cents);
    }
}
