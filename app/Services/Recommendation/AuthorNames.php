<?php

namespace App\Services\Recommendation;

use App\Support\BookIdentity;

final class AuthorNames
{
    /**
     * @return list<string>
     */
    public static function split(?string $author): array
    {
        return $author === null || trim($author) === '' ? [] : array_map(trim(...), explode(',', $author));
    }

    /**
     * The author a search starts from, in given-names order. A "Surname, Given" value is read before
     * the list is split, so it is not taken for two authors.
     */
    public static function primary(?string $author): ?string
    {
        if ($author === null || trim($author) === '') {
            return null;
        }

        if (self::isSurnameFirst($author)) {
            return BookIdentity::givenNamesFirst($author);
        }

        return self::split($author)[0] ?? null;
    }

    /**
     * A one-word surname before the comma ("Assis, Machado de") is one author; "Ana Silva, João Souza" is two.
     * Limit: a two-author list whose first author has a one-word name ("Platão, Plutarco") reads as surname first.
     */
    private static function isSurnameFirst(string $author): bool
    {
        $parts = self::split($author);

        return count($parts) === 2
            && ! str_contains($parts[0], ' ')
            && BookIdentity::givenNamesFirst($author) !== $author;
    }
}
