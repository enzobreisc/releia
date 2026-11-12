<?php

namespace App\Services\Recommendation;

final class AuthorNames
{
    /**
     * @return list<string>
     */
    public static function split(?string $author): array
    {
        return $author === null || trim($author) === '' ? [] : array_map(trim(...), explode(',', $author));
    }
}
