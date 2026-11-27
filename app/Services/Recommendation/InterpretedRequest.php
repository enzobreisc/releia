<?php

namespace App\Services\Recommendation;

/** A written request as the model read it, with its authors matched to yours. */
final readonly class InterpretedRequest
{
    /**
     * @param  list<string>  $authors
     * @param  list<string>  $excludedAuthors
     */
    public function __construct(
        public array $authors,
        public array $excludedAuthors,
        public ?int $maxPages,
        public bool $understood,
    ) {}
}
