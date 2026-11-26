<?php

namespace App\Services\BookLookup;

final readonly class EditionList
{
    /**
     * @param  list<BookCandidate>  $editions
     * @param  bool  $isComplete  false when a failure or the time limit cut the list short
     */
    public function __construct(
        public array $editions,
        public bool $isComplete,
    ) {}
}
