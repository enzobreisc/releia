<?php

namespace App\Services\Recommendation;

use App\Services\BookLookup\BookCandidate;
use Closure;

/**
 * What one search has created so far, across all the Open Library pages it reads: its limits, the keys that
 * must not repeat and the requests it has already made are kept for the whole search, never per page.
 */
final class SuggestionSearch
{
    private const MAX_NEW = 20;

    private const MAX_LOOKUPS = self::MAX_NEW * 2;

    /** Same author's works past this are left out: otherwise one prolific author fills the list. */
    private const MAX_WORKS_PER_AUTHOR = 3;

    /** Ignored suggestions may come back, but rarely: more than this and the list looks unchanged. */
    private const MAX_RETURNING = 1;

    /** @var list<Suggestion> */
    private array $created = [];

    private int $lookups = 0;

    private int $returning = 0;

    /** @var array<string, int> */
    private array $worksByAuthor = [];

    /** @var array<string, true> identity keys of the works whose edition was already looked up */
    private array $lookedUp = [];

    /** @var array<string, list<BookCandidate>> the answer to each request, empty ones included */
    private array $answers = [];

    /**
     * @param  array<string, true>  $blocked
     * @param  array<string, true>  $expired
     */
    public function __construct(
        private array $blocked,
        private readonly array $expired,
        private readonly float $deadline,
    ) {}

    /**
     * What the collector must skip: the keys that must not come back, and the works already looked up.
     *
     * @return array<string, true>
     */
    public function blocked(): array
    {
        return $this->blocked + $this->lookedUp;
    }

    public function deadline(): float
    {
        return $this->deadline;
    }

    public function isOutOfTime(): bool
    {
        return SearchBudget::isExceeded($this->deadline);
    }

    public function isExhausted(): bool
    {
        return count($this->created) >= self::MAX_NEW
            || $this->lookups >= self::MAX_LOOKUPS
            || $this->isOutOfTime();
    }

    /** @param  list<string>  $keys */
    public function isBlocked(array $keys): bool
    {
        return self::matchesAny($keys, $this->blocked);
    }

    /** @param  list<string>  $keys */
    public function isExpired(array $keys): bool
    {
        return self::matchesAny($keys, $this->expired);
    }

    public function countLookup(Suggestion $suggestion): void
    {
        $this->lookups++;

        foreach (SuggestionCollector::keysOf($suggestion->candidate) as $key) {
            $this->lookedUp[$key] = true;
        }
    }

    /**
     * Asks Open Library once per request in this search: an empty answer is kept too, so a later page
     * does not ask for it again, but a later search still asks.
     *
     * @param  Closure(): list<BookCandidate>  $ask
     * @return list<BookCandidate>
     */
    public function answerTo(string $request, Closure $ask): array
    {
        return $this->answers[$request] ??= $ask();
    }

    public function allowsAuthor(?string $authorKey): bool
    {
        return $authorKey === null || ($this->worksByAuthor[$authorKey] ?? 0) < self::MAX_WORKS_PER_AUTHOR;
    }

    public function allowsReturning(bool $isReturning): bool
    {
        return ! $isReturning || $this->returning < self::MAX_RETURNING;
    }

    /**
     * @param  list<string>  $keys  every identity key of the suggestion, so none of them comes back
     */
    public function accept(Suggestion $suggestion, array $keys, bool $isReturning): void
    {
        $this->created[] = $suggestion;
        $this->returning += (int) $isReturning;

        foreach ($keys as $key) {
            $this->blocked[$key] = true;
        }

        $authorKey = $suggestion->authorKey();

        if ($authorKey !== null) {
            $this->worksByAuthor[$authorKey] = ($this->worksByAuthor[$authorKey] ?? 0) + 1;
        }
    }

    /** @return list<Suggestion> */
    public function created(): array
    {
        return $this->created;
    }

    /**
     * @param  list<string>  $keys
     * @param  array<string, true>  $known
     */
    private static function matchesAny(array $keys, array $known): bool
    {
        return array_intersect_key(array_flip($keys), $known) !== [];
    }
}
