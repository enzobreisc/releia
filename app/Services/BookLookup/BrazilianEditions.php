<?php

namespace App\Services\BookLookup;

use App\Services\BookLookupService;
use Illuminate\Support\Facades\Cache;

/**
 * Brazilian editions by ISBN. BrasilAPI comes first (one call, Brazilian catalogue); each ISBN is cached.
 */
final class BrazilianEditions
{
    private const CACHE_KEY_PREFIX = 'author-edition:';

    private const CACHE_DAYS = 30;

    private const CATALOG_TRIES = 3;

    public function __construct(
        private readonly BrasilApiProvider $brasilApi,
        private readonly BookLookupService $lookup,
    ) {}

    /** Falls back to the other sources when BrasilAPI does not know the ISBN. */
    public function findByIsbn(string $isbn): ?BookCandidate
    {
        // BookLookupService::findByIsbn caches its own result.
        return $this->findInCatalog($isbn) ?? $this->lookup->findByIsbn($isbn);
    }

    /**
     * The first edition of a work, in the given order, that the catalog describes with an author. One
     * without an author is only used when no other is found, since such records often carry the title of
     * another book. The other sources are only asked about the first ISBN, to keep searches short.
     *
     * @param  list<string>  $isbns  most wanted first
     */
    public function firstDescribed(array $isbns): ?BookCandidate
    {
        if ($isbns === []) {
            return null;
        }

        $withoutAuthor = null;

        foreach (array_slice($isbns, 0, self::CATALOG_TRIES) as $isbn) {
            $edition = $this->findInCatalog($isbn);

            if ($edition !== null && $edition->authors !== []) {
                return $edition;
            }

            $withoutAuthor ??= $edition;
        }

        return $withoutAuthor ?? $this->lookup->findByIsbn($isbns[0]);
    }

    private function findInCatalog(string $isbn): ?BookCandidate
    {
        $cached = Cache::get(self::CACHE_KEY_PREFIX.$isbn);

        if ($cached !== null) {
            return BookCandidate::fromArray($cached);
        }

        $edition = $this->brasilApi->findByIsbn($isbn);

        if ($edition !== null) {
            Cache::put(self::CACHE_KEY_PREFIX.$isbn, $edition->toArray(), now()->addDays(self::CACHE_DAYS));
        }

        return $edition;
    }
}
