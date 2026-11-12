<?php

namespace App\Services;

use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\BrasilApiProvider;
use App\Services\BookLookup\GoogleBooksProvider;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Support\Isbn;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * @phpstan-import-type CandidateArray from BookCandidate
 *
 * Looks up and normalizes metadata: Open Library first; BrasilAPI (Brazilian ISBNs)
 * and Google Books complement it or serve as a fallback. Results are cached to avoid repeated calls.
 */
class BookLookupService
{
    private const CACHE_DAYS = 30;

    private const SUPPLEMENT_BELOW = 5;

    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly GoogleBooksProvider $googleBooks,
        private readonly BrasilApiProvider $brasilApi,
        private readonly CoverStore $covers,
    ) {}

    /**
     * An ISBN looks up one exact edition; any other text is searched by title.
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
        $cached = $this->remember('search:v3:'.mb_strtolower($query).'|'.$publisher, function () use ($query, $publisher) {
            $results = $this->openLibrary->search($query, $publisher);

            // The publisher is only a hint: Open Library has little publisher data, so without
            // results it searches by title alone.
            if ($results === [] && $publisher !== null) {
                $results = $this->openLibrary->search($query);
            }

            // Few results usually mean books that Open Library barely knows, so Google Books tops them up.
            if (count($results) < self::SUPPLEMENT_BELOW) {
                $results = $this->merge($results, $this->googleBooks->search($query, $publisher));
            }

            return array_map(fn (BookCandidate $book) => $book->toArray(), $results);
        });

        return array_map(BookCandidate::fromArray(...), $cached);
    }

    /**
     * Editions of a work with ISBN, without repeats, in the order they matter:
     * Brazilian first, then with a cover, then the most recent.
     *
     * @param  list<string>  $authors  work authors (editions do not carry them)
     * @param  string|null  $publisher  filters by publisher name, ignoring accents
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

    /**
     * Appends the extra results not yet in the list (same ISBN, or same title and first author).
     *
     * @param  list<BookCandidate>  $results
     * @param  list<BookCandidate>  $extra
     * @return list<BookCandidate>
     */
    private function merge(array $results, array $extra): array
    {
        $identify = fn (BookCandidate $book) => self::normalize($book->title.'|'.($book->authors[0] ?? ''));
        $seen = array_map($identify, $results);
        $isbns = array_filter(array_map(fn (BookCandidate $book) => $book->isbn13, $results));

        foreach ($extra as $book) {
            if (($book->isbn13 !== null && in_array($book->isbn13, $isbns, true)) || in_array($identify($book), $seen, true)) {
                continue;
            }

            $results[] = $book;
            $seen[] = $identify($book);
        }

        return $results;
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

            foreach ([$this->brasilApi, $this->googleBooks] as $provider) {
                if ($book !== null && $book->isComplete()) {
                    break;
                }

                $other = $provider->findByIsbn($isbn13);

                if ($other !== null) {
                    $book = $book?->fillFrom($other) ?? $other;
                }
            }

            // The metadata is complete but the cover is missing: look one up by ISBN.
            if ($book !== null && $book->coverUrl === null && ($cover = $this->covers->findByIsbn($isbn13)) !== null) {
                $book = $book->fillFrom(new BookCandidate(title: $book->title, source: $book->source, coverUrl: $cover));
            }

            return $book?->toArray();
        });

        return $cached === null ? null : BookCandidate::fromArray($cached);
    }

    /**
     * Only caches responses with results: a network failure must not stay cached.
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
