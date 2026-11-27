<?php

namespace App\Services\Recommendation;

use App\Support\BookIdentity;

/**
 * What one search is for: the general search from your books, or a request for some authors. Each limit a request
 * changes is read from here, so the general search keeps its behaviour.
 */
final readonly class SearchScope
{
    public const MAX_RESULTS = 20;

    /**
     * @param  list<RequestedAuthor>  $authors
     * @param  list<string>  $excludedAuthors  normalized names that must not appear
     */
    private function __construct(
        public bool $isRequest,
        public array $authors,
        public array $excludedAuthors,
        public ?int $maxPages,
        public int $capacity,
    ) {}

    public static function general(): self
    {
        return new self(isRequest: false, authors: [], excludedAuthors: [], maxPages: null, capacity: self::MAX_RESULTS);
    }

    public static function request(AuthorResolution $authors, ?int $maxPages): self
    {
        return new self(
            isRequest: true,
            authors: $authors->authors,
            excludedAuthors: array_map(BookIdentity::normalize(...), $authors->excludedNames),
            maxPages: $maxPages,
            capacity: self::MAX_RESULTS,
        );
    }

    /** How many new suggestions the search may still add: the pending ones it includes take the rest. */
    public function withCapacity(int $capacity): self
    {
        return new self($this->isRequest, $this->authors, $this->excludedAuthors, $this->maxPages, $capacity);
    }

    public function hasAuthors(): bool
    {
        return $this->authors !== [];
    }

    public function hasPageLimit(): bool
    {
        return $this->maxPages !== null;
    }

    /** @param  list<string>  $names */
    public function excludesAny(array $names): bool
    {
        return array_any($names, fn (string $name): bool => in_array(BookIdentity::normalize($name), $this->excludedAuthors, true));
    }
}
