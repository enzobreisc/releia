<?php

namespace App\Services\Recommendation;

final readonly class AuthorResolution
{
    /**
     * @param  list<RequestedAuthor>  $authors
     * @param  list<string>  $excludedNames  the library or shopping names the excluded ones matched
     */
    public function __construct(
        public array $authors,
        public array $excludedNames,
    ) {}

    /** @return list<string> */
    public function authorNames(): array
    {
        return array_map(fn (RequestedAuthor $author) => $author->name, $this->authors);
    }
}
