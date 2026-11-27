<?php

namespace App\Services\Recommendation;

/** The last request of this session, with the suggestions it answered with. */
final readonly class RememberedRequest
{
    /**
     * @param  list<string>  $authors
     * @param  list<string>  $excludedAuthors
     * @param  list<int>  $ids
     */
    public function __construct(
        public string $text,
        public array $authors,
        public array $excludedAuthors,
        public ?int $maxPages,
        public array $ids,
    ) {}
}
