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

/** Shopping list. Buying an item creates the book in the library, on the "want to read" shelf. */
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

        // Without a typed price, tries a reference price (the lowest on Estante Virtual).
        // It is only a starting point: it may be a used copy, and the field stays editable.
        if (! isset($data['estimated_price_cents'])) {
            $this->lookupPrice($item);
        }

        return $item;
    }

    /**
     * Takes a book off "want to read" and puts it on the shopping list. The book leaves the
     * library (its stored cover goes along); once bought, it is added again by ISBN.
     * Only for books not started yet: with sessions, notes or another reading, returns null.
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

    /** Price noted again: keeps the amount and the date it was checked. */
    public function updatePrice(ShoppingItem $item, ?int $cents): void
    {
        $item->forceFill([
            'estimated_price_cents' => $cents,
            'price_checked_at' => $cents === null ? null : now(),
        ])->save();
    }

    /**
     * Looks up the edition's lowest price (by ISBN) and keeps it as the item's price.
     * Returns the amount in cents, or null if not found (the noted price stays as is).
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
     * Marks as bought. If the item has no book yet, creates one (or reuses it, if the
     * ISBN is already in the library). The book enters the queue when asked to.
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
     * @param  iterable<ShoppingItem>  $items
     */
    public function buyMany(iterable $items, bool $addToQueue): void
    {
        foreach ($items as $item) {
            $this->buy($item, $addToQueue);
        }
    }

    /**
     * Unmarks the purchase. The book stays in the library (and on the item, so a new
     * purchase reuses it); if it entered the queue because of the purchase and has not
     * been started, it leaves the queue.
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

    /** "On buy, add to the queue" preference. Default: yes. */
    public static function queueOnBuy(): bool
    {
        return (bool) Setting::get(self::QUEUE_ON_BUY, true);
    }

    public static function setQueueOnBuy(bool $value): void
    {
        Setting::put(self::QUEUE_ON_BUY, $value);
    }

    /** Gives the book the cover stored on the item, if the book has none yet. */
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
     * With an ISBN, tries the full metadata before adding. The ISBN is unique in
     * the library, so a book already added is reused.
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
                // The metadata may bring another ISBN-13 of the same book; check again to avoid duplicates.
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
