<?php

namespace App\Services\Ai;

/**
 * What a written request asks for, as the model read it: names are as written, not yet matched to your authors.
 */
final readonly class ReadingFilters
{
    /**
     * @param  list<string>  $authors
     * @param  list<string>  $excludedAuthors
     */
    public function __construct(
        public array $authors = [],
        public array $excludedAuthors = [],
        public ?int $maxPages = null,
        public bool $understood = true,
    ) {}
}
