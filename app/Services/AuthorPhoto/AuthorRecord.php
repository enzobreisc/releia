<?php

namespace App\Services\AuthorPhoto;

/** What Open Library knows about one author record: its photos and where the person is described elsewhere. */
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
