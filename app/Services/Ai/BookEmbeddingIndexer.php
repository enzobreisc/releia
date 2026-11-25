<?php

namespace App\Services\Ai;

use App\Models\Book;
use App\Models\BookEmbedding;
use Illuminate\Database\Eloquent\Collection;

final readonly class BookEmbeddingIndexer
{
    private const BATCH_SIZE = 32;

    public function __construct(
        private EmbeddingProvider $provider,
        private string $prefix,
    ) {}

    /**
     * Embeds the given books that have no current vector. Stops before a batch once the deadline
     * has passed; the next run picks up the rest.
     *
     * @param  Collection<int, Book>  $books
     * @return int number of books embedded by this run
     *
     * @throws EmbeddingUnavailable
     */
    public function index(Collection $books, float $deadline = INF): int
    {
        $model = $this->provider->model();
        $books->loadMissing('authors');

        $embeddingsByBookId = BookEmbedding::query()
            ->where('model', $model)
            ->whereIn('book_id', $books->modelKeys())
            ->get()
            ->keyBy('book_id');

        $staleBooks = $books
            ->reject(fn (Book $book) => $this->isCurrent($book, $embeddingsByBookId->get($book->id)))
            ->values();

        $embedded = 0;

        foreach ($staleBooks->chunk(self::BATCH_SIZE) as $batch) {
            if (microtime(true) >= $deadline) {
                break;
            }

            $this->embedBatch($batch, $model);
            $embedded += $batch->count();
        }

        return $embedded;
    }

    private function isCurrent(Book $book, ?BookEmbedding $embedding): bool
    {
        return $embedding !== null
            && $embedding->source_hash === EmbeddingText::hash(EmbeddingText::forBook($book), $this->prefix);
    }

    /**
     * @param  Collection<int, Book>  $books
     *
     * @throws EmbeddingUnavailable
     */
    private function embedBatch(Collection $books, string $model): void
    {
        $texts = array_values($books->map(EmbeddingText::forBook(...))->all());
        $vectors = $this->provider->embed($texts);

        foreach ($books->values() as $position => $book) {
            BookEmbedding::query()->updateOrCreate(
                ['book_id' => $book->id, 'model' => $model],
                [
                    'vector' => $vectors[$position],
                    'source_hash' => EmbeddingText::hash($texts[$position], $this->prefix),
                ],
            );
        }
    }
}
