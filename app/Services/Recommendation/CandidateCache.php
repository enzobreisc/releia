<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BookCandidate;
use Closure;
use Illuminate\Support\Facades\Cache;

final class CandidateCache
{
    private const CACHE_DAYS = 7;

    /**
     * Caches the API response, but never an empty list (it may be a network error).
     *
     * @param  Closure(): list<BookCandidate>  $fetch
     * @return list<BookCandidate>
     */
    public function remember(string $key, Closure $fetch): array
    {
        $key = 'suggestions:v2:'.$key;

        if (Cache::has($key)) {
            return array_values(array_map(BookCandidate::fromArray(...), Cache::get($key)));
        }

        $candidates = $fetch();

        if ($candidates !== []) {
            Cache::put($key, array_map(fn (BookCandidate $c) => $c->toArray(), $candidates), now()->addDays(self::CACHE_DAYS));
        }

        return $candidates;
    }
}
