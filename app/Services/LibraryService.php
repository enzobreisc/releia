<?php

namespace App\Services;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use Illuminate\Support\Facades\DB;

/** Entrada e saída de livros da biblioteca. */
class LibraryService
{
    public function __construct(
        private readonly CoverStore $covers,
        private readonly ReadingService $readings,
    ) {}

    /**
     * @param  array{title: string, subtitle?: string|null, authors?: list<string>, isbn_13?: string|null, isbn_10?: string|null, publisher?: string|null, published_year?: int|null, pages?: int|null, genre?: string|null, description?: string|null, cover_url?: string|null, source?: string|null, status: string}  $data
     */
    public function add(array $data): Book
    {
        $book = DB::transaction(function () use ($data) {
            $book = Book::create([
                'title' => $data['title'],
                'subtitle' => $data['subtitle'] ?? null,
                'isbn_13' => $data['isbn_13'] ?? null,
                'isbn_10' => $data['isbn_10'] ?? null,
                'publisher' => $data['publisher'] ?? null,
                'published_year' => $data['published_year'] ?? null,
                'pages' => $data['pages'] ?? null,
                'genre' => $data['genre'] ?? null,
                'description' => $data['description'] ?? null,
                'source' => BookSource::tryFrom($data['source'] ?? '') ?? BookSource::Manual,
            ]);

            $book->syncAuthors($data['authors'] ?? []);
            $book->refreshSearchText();

            $reading = new Reading(['status' => ReadingStatus::WantToRead]);
            $reading->book()->associate($book);
            $this->readings->changeStatus($reading, ReadingStatus::from($data['status']));

            return $book;
        });

        // Fora da transação: a capa é opcional e uma falha não desfaz o cadastro.
        if (! empty($data['cover_url'])) {
            $this->covers->download($book, $data['cover_url']);
        }

        return $book;
    }

    public function remove(Book $book): void
    {
        $this->covers->delete($book);
        $book->delete();
    }
}
