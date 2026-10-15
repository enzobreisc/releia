<?php

namespace App\Services;

use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\GoogleBooksProvider;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Support\Isbn;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * @phpstan-import-type CandidateArray from BookCandidate
 *
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
    public function search(string $query, ?string $publisher = null): array
    {
        $query = trim($query);
        $publisher = self::normalize($publisher ?? '') ?: null;

        if ($query === '') {
            return [];
        }

        $isbn = Isbn::toIsbn13($query);

        if ($isbn !== null) {
            $book = $this->findByIsbn($isbn);

            return $book ? [$book] : [];
        }

        /** @var list<CandidateArray> $cached */
        $cached = $this->remember('search:v2:'.mb_strtolower($query).'|'.$publisher, function () use ($query, $publisher) {
            $results = $this->openLibrary->search($query, $publisher);

            if ($results === []) {
                $results = $this->googleBooks->search($query, $publisher);
            }

            return array_map(fn (BookCandidate $book) => $book->toArray(), $results);
        });

        return array_map(BookCandidate::fromArray(...), $cached);
    }

    /**
     * Edições de uma obra com ISBN, sem repetidas, na ordem em que interessam:
     * brasileiras primeiro, depois com capa, depois as mais recentes.
     *
     * @param  list<string>  $authors  autores da obra (as edições não trazem)
     * @param  string|null  $publisher  filtra pelo nome da editora, sem acento
     * @return list<BookCandidate>
     */
    public function editions(string $workKey, array $authors = [], ?string $publisher = null): array
    {
        /** @var list<CandidateArray> $cached */
        $cached = $this->remember("editions:{$workKey}", function () use ($workKey) {
            $unique = [];

            foreach ($this->openLibrary->editions($workKey) as $edition) {
                if ($edition->isbn13 !== null) {
                    $unique[$edition->isbn13] ??= $edition;
                }
            }

            $editions = array_values($unique);

            usort($editions, fn (BookCandidate $a, BookCandidate $b) => [
                Isbn::isBrazilian((string) $b->isbn13),
                $b->coverUrl !== null,
                $b->publishedYear ?? 0,
            ] <=> [
                Isbn::isBrazilian((string) $a->isbn13),
                $a->coverUrl !== null,
                $a->publishedYear ?? 0,
            ]);

            return array_map(fn (BookCandidate $edition) => $edition->toArray(), $editions);
        });

        $publisher = self::normalize($publisher ?? '');

        if ($publisher !== '') {
            $cached = array_values(array_filter(
                $cached,
                fn (array $edition) => str_contains(self::normalize($edition['publisher'] ?? ''), $publisher),
            ));
        }

        return array_map(
            fn (array $edition) => BookCandidate::fromArray(['authors' => $authors] + $edition),
            $cached,
        );
    }

    private static function normalize(string $value): string
    {
        return Str::of($value)->ascii()->lower()->squish()->toString();
    }

    public function findByIsbn(string $isbn13): ?BookCandidate
    {
        /** @var CandidateArray|null $cached */
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
