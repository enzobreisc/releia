<?php

namespace App\Services\Recommendation;

/** What you asked for in writing: the text and the authors to include and to leave out, as names. */
final readonly class SuggestionRequest
{
    /**
     * @param  list<string>  $authors
     * @param  list<string>  $excludedAuthors
     */
    public function __construct(
        public string $text,
        public array $authors,
        public array $excludedAuthors,
        public ?int $maxPages,
    ) {}
}
