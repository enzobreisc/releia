<?php

namespace App\Services\BookLookup;

/** Uma fonte externa de metadados de livros. */
interface MetadataProvider
{
    public function findByIsbn(string $isbn13): ?BookCandidate;

    /**
     * @return list<BookCandidate>
     */
    public function search(string $query): array;
}
