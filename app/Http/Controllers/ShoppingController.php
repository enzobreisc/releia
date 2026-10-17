<?php

namespace App\Http\Controllers;

use App\Enums\StoreType;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\QueuePresenter;
use App\Http\Requests\ShoppingItemRequest;
use App\Http\Requests\ShoppingPriceRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\BookLookupService;
use App\Services\ShoppingService;
use App\Services\UndoService;
use App\Support\AmazonLink;
use App\Support\Money;
use App\Support\StoreLinks;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Native\Desktop\Facades\Shell;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ShoppingController extends Controller
{
    /** Tira da estante "quero ler" e leva para a lista de compras. */
    public function fromBook(Book $book): RedirectResponse
    {
        $title = $book->title;

        if ($this->shopping->fromWishlist($book) === null) {
            Toast::error("{$title} não pode ir para as compras", 'só livros em "quero ler", sem leitura iniciada');

            return back();
        }

        Toast::success("{$title} foi para as compras", 'saiu de "quero ler"');

        return to_route('shopping.index');
    }

    /** Correspondências mostradas na busca da lista de compras. */
    private const MATCH_LIMIT = 5;

    public function __construct(private readonly ShoppingService $shopping) {}

    /** Lista de compras (filtrada por loja) e total estimado dos itens pendentes. */
    public function index(Request $request, BookLookupService $lookup): Response
    {
        $store = StoreType::tryFrom($request->string('store')->toString());

        $status = $request->string('status')->toString();
        $search = $request->string('q')->trim()->toString();
        $sort = $request->string('sort')->toString();

        $shopping = ShoppingItem::query()
            ->when($store, fn ($query, StoreType $store) => $query->where('store_type', $store->value))
            ->when($status === 'pending', fn ($query) => $query->whereNull('bought_at'))
            ->when($status === 'bought', fn ($query) => $query->whereNotNull('bought_at'))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $query->where('title', 'like', $like)->orWhere('author', 'like', $like);
            }))
            ->orderByRaw('bought_at IS NOT NULL')
            ->when($sort === 'price_asc', fn ($query) => $query->orderByRaw('estimated_price_cents IS NULL')->orderBy('estimated_price_cents'))
            ->when($sort === 'price_desc', fn ($query) => $query->orderByRaw('estimated_price_cents IS NULL')->orderByDesc('estimated_price_cents'))
            ->when($sort === 'title', fn ($query) => $query->orderBy('title'))
            ->when($sort === 'recent', fn ($query) => $query->orderByDesc('id'))
            ->orderBy('id')
            ->get();

        $pending = $shopping->whereNull('bought_at');
        $queuedBookIds = QueueItem::query()->pluck('book_id');

        // Itens por comprar em cada loja, para as abas (sem o filtro atual).
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
                'status' => in_array($status, ['pending', 'bought'], true) ? $status : null,
                'q' => $search !== '' ? $search : null,
                'sort' => in_array($sort, ['price_asc', 'price_desc', 'title', 'recent'], true) ? $sort : null,
            ],
            // "Ao comprar": vai para quero ler e também para a fila? Fica salvo.
            'queue_on_buy' => ShoppingService::queueOnBuy(),
            // Busca de correspondência (ISBN, título ou link da Amazon), só por recarga parcial.
            'matches' => Inertia::optional(fn () => $this->matches($request->string('match')->trim()->toString(), $lookup)),
            'totals' => [
                'pending_count' => $pending->count(),
                'pending_cents' => (int) $pending->sum('estimated_price_cents'),
            ],
            'queue_count' => $queuedBookIds->count(),
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

    public function store(ShoppingItemRequest $request): RedirectResponse
    {
        $item = $this->shopping->add($request->payload());

        Toast::success('Adicionado à lista de compras', $item->title);

        return back();
    }

    public function update(ShoppingPriceRequest $request, ShoppingItem $shoppingItem): RedirectResponse
    {
        $this->shopping->updatePrice($shoppingItem, $request->cents());

        Toast::success('Preço atualizado', $shoppingItem->title);

        return back();
    }

    /** "Buscar preço": o menor preço da edição na Estante Virtual, com desfazer. */
    public function lookupPrice(ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        if ($shoppingItem->isbn === null) {
            Toast::error('Sem ISBN não dá para buscar o preço', 'Anote o preço à mão.');

            return back();
        }

        $snapshot = $undo->capture([UndoService::scope('shopping_items', ['id' => $shoppingItem->id])]);
        $cents = $this->shopping->lookupPrice($shoppingItem);

        if ($cents === null) {
            Toast::error('Não achei o preço dessa edição', 'Não está à venda na Estante Virtual, ou o site não respondeu. Anote à mão.');

            return back();
        }

        Toast::success(
            'A partir de '.Money::format($cents),
            $shoppingItem->title.' · menor preço na Estante Virtual (inclui usados)',
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /**
     * Abre o link de compra no navegador padrão. A janela nativa não abre abas
     * novas, então o pedido passa pelo Shell do NativePHP.
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

        Toast::success('Item excluído', $shoppingItem->title.$this->priceSuffix($shoppingItem), null, $undo->remember($snapshot));

        return back();
    }

    /** Compra o item: cria o livro na biblioteca e, pela preferência salva, põe na fila. */
    public function buy(Request $request, ShoppingItem $shoppingItem, UndoService $undo): RedirectResponse
    {
        $queue = $request->has('queue') ? $request->boolean('queue') : ShoppingService::queueOnBuy();
        $snapshot = $undo->capture([
            UndoService::scope('shopping_items', ['id' => $shoppingItem->id]),
            UndoService::scope('queue_items'),
        ]);

        $this->shopping->buy($shoppingItem, $queue);
        $shoppingItem->refresh();

        // Desfazer devolve o item como não comprado, mas mantém o vínculo com o livro já criado.
        $snapshot = $undo->override($snapshot, 'shopping_items', ['book_id' => $shoppingItem->book_id]);
        $position = $shoppingItem->book_id === null ? null : QueueItem::query()->where('book_id', $shoppingItem->book_id)->value('position');

        Toast::success(
            'Comprado',
            $shoppingItem->title.($queue && $position !== null
                ? ' · foi para quero ler e entrou em '.Toast::ordinal((int) $position).' na fila'
                : ' · foi para quero ler'),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /** Desmarca a compra (D10). */
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
            'Desmarcado como comprado',
            $shoppingItem->title.($wasQueued && ! $stillQueued ? ' · saiu da fila' : ''),
            null,
            $undo->remember($snapshot),
        );

        return back();
    }

    /** Preferência "ao comprar": só quero ler ou quero ler + fila. */
    public function preference(Request $request): RedirectResponse
    {
        $data = $request->validate(['queue_on_buy' => ['required', 'boolean']]);

        ShoppingService::setQueueOnBuy((bool) $data['queue_on_buy']);

        return back();
    }

    private function priceSuffix(ShoppingItem $item): string
    {
        return $item->estimated_price_cents === null ? '' : ' · '.Money::format($item->estimated_price_cents);
    }
}
