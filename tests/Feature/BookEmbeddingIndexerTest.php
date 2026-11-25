<?php

use App\Models\Book;
use App\Models\BookEmbedding;
use App\Services\Ai\BookEmbeddingIndexer;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

function booksWithAuthors(int $count): void
{
    Book::factory()->count($count)->create(['genre' => 'Romance'])->each(
        fn (Book $book) => $book->syncAuthors(['Autor Teste']),
    );
}

function indexAllBooks(float $deadline = INF): int
{
    return app(BookEmbeddingIndexer::class)->index(Book::query()->get(), $deadline);
}

test('embeds all new books in one request and stores their vectors', function () {
    fakeOllamaEmbeddings();
    booksWithAuthors(3);

    expect(indexAllBooks())->toBe(3);

    Http::assertSentCount(1);
    expect(BookEmbedding::query()->where('model', configuredEmbeddingModel())->count())->toBe(3);
});

test('does not send a request when every book is already embedded', function () {
    fakeOllamaEmbeddings();
    booksWithAuthors(2);
    indexAllBooks();

    expect(indexAllBooks())->toBe(0);

    Http::assertSentCount(1);
});

test('re-embeds only the book whose title changed', function () {
    fakeOllamaEmbeddings();
    booksWithAuthors(2);
    indexAllBooks();
    Book::query()->first()->update(['title' => 'Título novo']);

    expect(indexAllBooks())->toBe(1);

    Http::assertSentCount(2);
});

test('sends at most 32 books in each request', function () {
    fakeOllamaEmbeddings();
    booksWithAuthors(33);

    indexAllBooks();

    Http::assertSentCount(2);
    Http::assertNotSent(fn (Request $request): bool => count($request['input']) > 32);
    expect(BookEmbedding::query()->where('model', configuredEmbeddingModel())->count())->toBe(33);
});

test('sends nothing when the deadline has already passed', function () {
    fakeOllamaEmbeddings();
    booksWithAuthors(2);

    expect(indexAllBooks(microtime(true) - 1))->toBe(0);

    Http::assertNothingSent();
    expect(BookEmbedding::query()->count())->toBe(0);
});

test('keeps embeddings stored for another model', function () {
    fakeOllamaEmbeddings();
    $book = Book::factory()->create();
    BookEmbedding::create([
        'book_id' => $book->id,
        'model' => 'other-model',
        'vector' => [0.1, 0.2],
        'source_hash' => str_repeat('a', 64),
    ]);

    expect(indexAllBooks())->toBe(1);

    expect(BookEmbedding::query()->where('model', 'other-model')->exists())->toBeTrue()
        ->and(BookEmbedding::query()->where('model', configuredEmbeddingModel())->count())->toBe(1);
});
