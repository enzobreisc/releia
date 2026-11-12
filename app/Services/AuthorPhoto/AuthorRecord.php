<?php

namespace App\Services\AuthorPhoto;

final readonly class AuthorRecord
{
    /**
     * @param  list<string>  $photoUrls
     * @param  array<string, string>  $wikipediaTitles  language code => article title
     */
    public function __construct(
        public string $key,
        public array $photoUrls = [],
        public ?string $wikidataId = null,
        public array $wikipediaTitles = [],
    ) {}
}
