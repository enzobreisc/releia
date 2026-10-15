<?php

namespace App\Services;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\ShoppingItem;
use App\Services\BookLookup\BookCandidate;
use Illuminate\Support\Facades\DB;

/** Lista de compras. Comprar um item cria o livro na biblioteca, na estante "quero ler". */
class ShoppingService
{
    public function __construct(
        private readonly LibraryService $library,
        private readonly BookLookupService $lookup,
        private readonly QueueService $queue,
    ) {}

    /**
     * @param  array{title: string, author?: string, isbn?: string|null, store_type: string, estimated_price_cents?: int|null}  $data
     */
    public function add(array $data): ShoppingItem
    {
        return ShoppingItem::create($data);
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

            if ($addToQueue) {
                $this->queue->add($book);
            }
        });
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
            'source' => BookSource::Manual->value,
            'status' => ReadingStatus::WantToRead->value,
        ]);
    }
}
