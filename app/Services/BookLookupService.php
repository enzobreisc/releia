<?php

namespace App\Services;

use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\GoogleBooksProvider;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Support\Isbn;
use Illuminate\Support\Facades\Cache;

/**
 * Busca e normaliza metadados: Open Library primeiro, Google Books para
 * completar ou como reserva. Resultados ficam em cache para não repetir chamadas.
 */
class BookLookupService
{
    private const CACHE_DAYS = 30;

    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly GoogleBooksProvider $googleBooks,
    ) {}

    /**
     * ISBN busca uma edição exata; qualquer outro texto busca por título.
     *
     * @return list<BookCandidate>
     */
    public function search(string $query): array
    {
        $query = trim($query);

        if ($query === '') {
            return [];
        }

        $isbn = Isbn::toIsbn13($query);

        if ($isbn !== null) {
            $book = $this->findByIsbn($isbn);

            return $book ? [$book] : [];
        }

        /** @var list<array{isbn_13: string|null, isbn_10: string|null, title: string, subtitle: string|null, authors: list<string>, publisher: string|null, published_year: int|null, pages: int|null, genre: string|null, description: string|null, cover_url: string|null, source: string}> $cached */
        $cached = $this->remember('search:'.mb_strtolower($query), function () use ($query) {
            $results = $this->openLibrary->search($query);

            if ($results === []) {
                $results = $this->googleBooks->search($query);
            }

            return array_map(fn (BookCandidate $book) => $book->toArray(), $results);
        });

        return array_map(BookCandidate::fromArray(...), $cached);
    }

    public function findByIsbn(string $isbn13): ?BookCandidate
    {
        /** @var array{isbn_13: string|null, isbn_10: string|null, title: string, subtitle: string|null, authors: list<string>, publisher: string|null, published_year: int|null, pages: int|null, genre: string|null, description: string|null, cover_url: string|null, source: string}|null $cached */
        $cached = $this->remember("isbn:{$isbn13}", function () use ($isbn13) {
            $book = $this->openLibrary->findByIsbn($isbn13);

            if ($book === null || ! $book->isComplete()) {
                $google = $this->googleBooks->findByIsbn($isbn13);

                if ($google !== null) {
                    $book = $book?->fillFrom($google) ?? $google;
                }
            }

            return $book?->toArray();
        });

        return $cached === null ? null : BookCandidate::fromArray($cached);
    }

    /**
     * Guarda só respostas com resultado: uma falha de rede não deve ficar em cache.
     */
    private function remember(string $key, callable $callback): mixed
    {
        $key = 'book-lookup:'.$key;

        if (Cache::has($key)) {
            return Cache::get($key);
        }

        $value = $callback();

        if ($value !== null && $value !== []) {
            Cache::put($key, $value, now()->addDays(self::CACHE_DAYS));
        }

        return $value;
    }
}
