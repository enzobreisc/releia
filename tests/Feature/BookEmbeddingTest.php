<?php

use App\Models\Book;
use App\Models\BookEmbedding;
use Illuminate\Database\UniqueConstraintViolationException;

function embeddingFor(Book $book, string $model = 'nomic-embed-text'): array
{
    return [
        'book_id' => $book->id,
        'model' => $model,
        'vector' => [0.5, -0.25],
        'source_hash' => hash('sha256', $book->title),
    ];
}

test('a stored book vector reads back equal', function () {
    $book = Book::factory()->create();

    $embedding = BookEmbedding::create(embeddingFor($book));

    expect($embedding->fresh()->vector)->toBe([0.5, -0.25]);
});

test('deleting a book deletes its embeddings', function () {
    $book = Book::factory()->create();
    BookEmbedding::create(embeddingFor($book));

    $book->delete();

    expect(BookEmbedding::query()->count())->toBe(0);
});

test('a second embedding for the same book and model violates the unique constraint', function () {
    $book = Book::factory()->create();
    BookEmbedding::create(embeddingFor($book));

    expect(fn () => BookEmbedding::create(embeddingFor($book)))
        ->toThrow(UniqueConstraintViolationException::class);
});
