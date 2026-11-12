<?php

namespace App\Services;

use App\Models\Author;
use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\BrasilApiProvider;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Support\BookIdentity;
use App\Support\Isbn;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Works of an author. Identity comes from Open Library keys, not from the name: the key is
 * taken from the ISBN of one of your books (unambiguous) and, only when there is no ISBN,
 * from a name that leaves no doubt. If neither identifies the author, no works are shown
 * (better nothing than works by a namesake).
 */
class AuthorService
{
    private const CACHE_DAYS = 7;

    private const MAX_WORKS = 30;

    private const ISBN_TRIES = 3;

    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly BrasilApiProvider $brasilApi,
        private readonly BookLookupService $lookup,
    ) {}

    /**
     * Author keys, stored after the first lookup. Empty means the identity could not be confirmed.
     *
     * @return list<string>
     */
    public function keys(Author $author): array
    {
        if ($author->open_library_key !== null && $author->open_library_key !== '') {
            return explode(',', $author->open_library_key);
        }

        $keys = $this->keysFromBooks($author);

        if ($keys === []) {
            $keys = $this->openLibrary->authorKeysByName($author->name);
        }

        if ($keys === []) {
            $keys = $this->confirmedByLibrary($author);
        }

        // A network failure must not turn into an identity-less author for good, so only found keys are stored.
        if ($keys !== []) {
            $author->update(['open_library_key' => implode(',', $keys)]);
        }

        return $keys;
    }

    /**
     * Keys from the books you own by this author: ISBN first, title when Open Library does not
     * know the edition. The book is the anchor, so namesakes are excluded.
     *
     * @return list<string>
     */
    private function keysFromBooks(Author $author): array
    {
        $books = $author->books()->limit(5)->get(['books.id', 'title', 'isbn_13']);

        foreach ($books as $book) {
            $isbnKeys = $book->isbn_13 !== null ? $this->openLibrary->authorKeysForIsbn($book->isbn_13, $author->name) : [];

            // The ISBN may be listed under a misspelled duplicate of the author ("Machado de Assís"),
            // so the title search adds the main record.
            $keys = array_values(array_unique([...$isbnKeys, ...$this->openLibrary->authorKeysForTitle($book->title, $author->name)]));

            if ($keys !== []) {
                return $keys;
            }
        }

        return [];
    }

    /**
     * Last resort: records named exactly like the author (common for famous authors, which Open
     * Library duplicates). Only valid if one of your books appears among their works, by ISBN.
     *
     * @return list<string>
     */
    private function confirmedByLibrary(Author $author): array
    {
        $candidates = array_keys(array_filter($this->openLibrary->authorKeyCandidatesByName($author->name), fn (int $count) => $count >= 5));

        if ($candidates === []) {
            return [];
        }

        $owned = $this->ownedKeys(collect([$author]));

        foreach ($this->openLibrary->worksByAuthorKeys($candidates) as $work) {
            $keys = [...array_map(fn (string $isbn) => 'isbn:'.$isbn, $work['isbns']), 'title:'.BookIdentity::normalizeTitle($work['candidate']->title)];

            if (array_intersect($keys, $owned) !== []) {
                return $candidates;
            }
        }

        return [];
    }

    /**
     * @return Collection<int, Author>
     */
    public function sameAuthors(Author $author): Collection
    {
        $keys = $author->open_library_key === null ? [] : explode(',', $author->open_library_key);

        return Author::query()
            ->where('id', $author->id)
            ->when($keys !== [], function ($query) use ($keys) {
                foreach ($keys as $key) {
                    $query->orWhere('open_library_key', 'like', "%{$key}%");
                }
            })
            ->get();
    }

    /**
     * @return array{verified: bool, items: list<array<string, mixed>>}
     */
    public function works(Author $author): array
    {
        $keys = $this->keys($author);

        if ($keys === []) {
            return ['verified' => false, 'items' => []];
        }

        $works = $this->cachedWorks($keys);

        $owned = $this->ownedKeys($this->sameAuthors($author));
        $seen = [];
        $items = [];

        foreach ($works as $work) {
            if (count($items) >= self::MAX_WORKS) {
                break;
            }

            // Open Library lists translations as separate works, so only one with a Brazilian edition counts.
            $brazilian = array_values(array_filter($work['isbns'], Isbn::isBrazilian(...)));

            if (! $work['portuguese'] || $brazilian === []) {
                continue;
            }

            $original = BookIdentity::normalizeTitle($work['candidate']->title);

            if (array_intersect(['title:'.$original, ...array_map(fn (string $isbn) => 'isbn:'.$isbn, $work['isbns'])], $owned) !== []) {
                continue;
            }

            $edition = $this->portugueseEdition($brazilian);

            if ($edition === null) {
                continue;
            }

            $title = BookIdentity::normalizeTitle($edition->title);

            if ($title === '' || isset($seen[$title]) || in_array('title:'.$title, $owned, true) || in_array($title, array_map(BookIdentity::normalize(...), $work['candidate']->authors), true)) {
                continue;
            }

            $seen[$title] = true;
            $items[] = [
                'title' => $edition->title,
                'year' => $work['candidate']->publishedYear ?? $edition->publishedYear,
                'cover_url' => $edition->coverUrl ?? $work['candidate']->coverUrl,
                'work_key' => $work['candidate']->workKey,
                'edition_count' => $work['candidate']->editionCount,
                'portuguese' => true,
                'isbn_13' => $edition->isbn13,
            ];
        }

        return ['verified' => true, 'items' => $items];
    }

    /**
     * Cached as plain arrays: the cache does not unserialize objects (`cache.serializable_classes`),
     * so a cached BookCandidate would come back as an incomplete class and break the request.
     *
     * @param  list<string>  $keys
     * @return list<array{candidate: BookCandidate, isbns: list<string>, portuguese: bool}>
     */
    private function cachedWorks(array $keys): array
    {
        $cacheKey = 'author-works:v3:'.implode(',', $keys);
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return array_values(array_map(fn (array $work) => ['candidate' => BookCandidate::fromArray($work['candidate']), 'isbns' => $work['isbns'], 'portuguese' => $work['portuguese']], $cached));
        }

        $works = $this->openLibrary->worksByAuthorKeys($keys);

        // Empty may be a network failure: do not cache it.
        if ($works !== []) {
            Cache::put($cacheKey, array_map(fn (array $work) => [...$work, 'candidate' => $work['candidate']->toArray()], $works), now()->addDays(self::CACHE_DAYS));
        }

        return $works;
    }

    /**
     * Portuguese edition by ISBN: BrasilAPI first (Brazilian catalogue, reliable title), then the
     * other sources when it does not know the ISBN.
     *
     * @param  list<string>  $isbns  Brazilian ISBNs of the work
     */
    private function portugueseEdition(array $isbns): ?BookCandidate
    {
        foreach (array_slice($isbns, 0, self::ISBN_TRIES) as $isbn) {
            $key = 'author-edition:'.$isbn;
            $cached = Cache::get($key);

            if ($cached !== null) {
                return BookCandidate::fromArray($cached);
            }

            $edition = $this->brasilApi->findByIsbn($isbn);

            if ($edition !== null) {
                Cache::put($key, $edition->toArray(), now()->addDays(30));

                return $edition;
            }
        }

        // BookLookupService::findByIsbn already caches its result.
        return $this->lookup->findByIsbn($isbns[0]);
    }

    /**
     * @param  Collection<int, Author>  $authors
     * @return list<string>
     */
    private function ownedKeys(Collection $authors): array
    {
        $keys = [];

        $books = Book::query()
            ->whereHas('authors', fn ($query) => $query->whereIn('authors.id', $authors->pluck('id')))
            ->get(['title', 'isbn_13', 'isbn_10']);

        foreach ($books as $book) {
            $keys[] = 'title:'.BookIdentity::normalizeTitle($book->title);

            foreach ([$book->isbn_13, $book->isbn_10] as $isbn) {
                if ($isbn !== null && $isbn !== '') {
                    $keys[] = 'isbn:'.(Isbn::toIsbn13($isbn) ?? $isbn);
                }
            }
        }

        return array_values(array_unique($keys));
    }
}
