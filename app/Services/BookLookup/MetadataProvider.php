<?php

namespace App\Services\BookLookup;

interface MetadataProvider
{
    public function findByIsbn(string $isbn13): ?BookCandidate;

    /**
     * @return list<BookCandidate>
     */
    public function search(string $query, ?string $publisher = null): array;
}
