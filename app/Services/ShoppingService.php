<?php

namespace App\Services;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Enums\StoreType;
use App\Models\Book;
use App\Models\Note;
use App\Models\QueueItem;
use App\Models\Setting;
use App\Models\ShoppingItem;
use App\Services\BookLookup\BookCandidate;
use App\Services\PriceLookup\EstanteVirtualProvider;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Lista de compras. Comprar um item cria o livro na biblioteca, na estante "quero ler". */
class ShoppingService
{
    private const QUEUE_ON_BUY = 'shopping_queue_on_buy';

    public function __construct(
        private readonly LibraryService $library,
        private readonly BookLookupService $lookup,
        private readonly QueueService $queue,
        private readonly EstanteVirtualProvider $prices,
    ) {}

    /**
     * @param  array{title: string, author?: string, isbn?: string|null, cover_url?: string|null, url?: string|null, store_type: string, estimated_price_cents?: int|null, price_checked_at?: CarbonInterface|null}  $data
     */
    public function add(array $data): ShoppingItem
    {
        $item = ShoppingItem::create($data);

        // Sem preço digitado, tenta um preço de referência (menor da Estante Virtual).
        // É só um ponto de partida: pode ser de usado, e o campo continua editável.
        if (! isset($data['estimated_price_cents'])) {
            $this->lookupPrice($item);
        }

        return $item;
    }

    /**
     * Tira um livro de "quero ler" e põe na lista de compras. O livro sai da biblioteca
     * (a capa guardada vai junto); ao comprar, volta a ser cadastrado pelo ISBN.
     * Só vale para quem ainda não começou: com sessões, notas ou outra leitura, devolve null.
     */
    public function fromWishlist(Book $book): ?ShoppingItem
    {
        $reading = $book->currentReading;

        if ($reading?->status !== ReadingStatus::WantToRead
            || $book->readings()->count() > 1
            || $reading->sessions()->exists()
            || Note::query()->where('book_id', $book->id)->exists()) {
            return null;
        }

        return DB::transaction(function () use ($book) {
            $coverPath = null;

            if ($book->cover_path !== null && Storage::disk('local')->exists($book->cover_path)) {
                $coverPath = 'shopping-covers/'.Str::uuid().'.'.pathinfo($book->cover_path, PATHINFO_EXTENSION);
                Storage::disk('local')->copy($book->cover_path, $coverPath);
            }

            $item = $this->add([
                'cover_path' => $coverPath,
                'title' => $book->title,
                'author' => $book->authors->pluck('name')->implode(', '),
                'isbn' => $book->isbn_13,
                'store_type' => StoreType::Online->value,
            ]);

            $this->library->remove($book);

            return $item;
        });
    }

    /** Preço anotado de novo: guarda o valor e a data em que você conferiu. */
    public function updatePrice(ShoppingItem $item, ?int $cents): void
    {
        $item->forceFill([
            'estimated_price_cents' => $cents,
            'price_checked_at' => $cents === null ? null : now(),
        ])->save();
    }

    /**
     * Busca o menor preço da edição (pelo ISBN) e guarda como preço do item.
     * Devolve o valor em centavos, ou null se não achou (o preço anotado fica como está).
     */
    public function lookupPrice(ShoppingItem $item): ?int
    {
        if ($item->isbn === null) {
            return null;
        }

        $cents = $this->prices->lowestPriceCents($item->isbn);

        if ($cents !== null) {
            $this->updatePrice($item, $cents);
        }

        return $cents;
    }

    /**
     * Marca como comprado. Se o item ainda não tem livro, cria (ou reaproveita, se o
     * ISBN já está na biblioteca). Só o item fica marcado; o livro entra na fila se pedido.
     */
    public function buy(ShoppingItem $item, bool $addToQueue): void
    {
        if ($item->bought_at !== null) {
            return;
        }

        $book = $item->book ?? $this->bookFor($item);

        DB::transaction(function () use ($item, $book, $addToQueue) {
            $item->forceFill(['book_id' => $book->id, 'bought_at' => now()])->save();
            $this->restoreCover($item, $book);

            if ($addToQueue) {
                $this->queue->add($book);
            }
        });
    }

    /**
     * Desmarca a compra. O livro continua na biblioteca (e no item, para uma nova
     * compra reaproveitá-lo); se ele entrou na fila por causa da compra e ainda não
     * começou, sai da fila.
     */
    public function unbuy(ShoppingItem $item): void
    {
        if ($item->bought_at === null) {
            return;
        }

        DB::transaction(function () use ($item) {
            $book = $item->book;
            $boughtAt = $item->bought_at;

            $item->forceFill(['bought_at' => null])->save();

            if ($book === null) {
                return;
            }

            $queued = QueueItem::query()->where('book_id', $book->id)->first();
            $notStarted = $book->currentReading?->status === ReadingStatus::WantToRead
                && $book->currentReading->sessions()->doesntExist();

            if ($queued !== null && $notStarted && $queued->added_at->greaterThanOrEqualTo($boughtAt->copy()->startOfSecond())) {
                $this->queue->remove($queued);
            }
        });
    }

    /** Preferência "ao comprar, pôr na fila". Padrão: sim. */
    public static function queueOnBuy(): bool
    {
        return (bool) Setting::get(self::QUEUE_ON_BUY, true);
    }

    public static function setQueueOnBuy(bool $value): void
    {
        Setting::put(self::QUEUE_ON_BUY, $value);
    }

    /** Devolve ao livro a capa guardada no item, se o livro ainda não tem uma. */
    private function restoreCover(ShoppingItem $item, Book $book): void
    {
        if ($item->cover_path === null) {
            return;
        }

        $disk = Storage::disk('local');

        if ($book->cover_path === null && $disk->exists($item->cover_path)) {
            $path = "covers/{$book->id}.".pathinfo($item->cover_path, PATHINFO_EXTENSION);
            $disk->put($path, (string) $disk->get($item->cover_path));
            $book->update(['cover_path' => $path]);
        }

        $disk->delete($item->cover_path);
        $item->forceFill(['cover_path' => null])->save();
    }

    /**
     * Com ISBN, tenta os metadados completos antes de cadastrar. O ISBN é único
     * na biblioteca, então um livro já cadastrado é reaproveitado.
     */
    private function bookFor(ShoppingItem $item): Book
    {
        if ($item->isbn !== null) {
            $existing = Book::query()->where('isbn_13', $item->isbn)->first();

            if ($existing !== null) {
                return $existing;
            }

            $candidate = $this->lookup->findByIsbn($item->isbn);

            if ($candidate instanceof BookCandidate) {
                // Os metadados podem trazer outro ISBN-13 do mesmo livro; checa de novo para não duplicar.
                $existing = $candidate->isbn13 === null
                    ? null
                    : Book::query()->where('isbn_13', $candidate->isbn13)->first();

                return $existing ?? $this->library->add([
                    ...$candidate->toArray(),
                    'status' => ReadingStatus::WantToRead->value,
                ]);
            }
        }

        return $this->library->add([
            'title' => $item->title,
            'authors' => $item->author !== '' ? [$item->author] : [],
            'isbn_13' => $item->isbn,
            'cover_url' => $item->cover_url,
            'source' => BookSource::Manual->value,
            'status' => ReadingStatus::WantToRead->value,
        ]);
    }
}
