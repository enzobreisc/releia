<?php

namespace App\Support;

use App\Models\Book;

final class AuthorName
{
    private const GENERATIONAL_SUFFIXES = ['jr', 'jr.', 'junior', 'filho', 'neto', 'sobrinho'];

    /** "Itamar Vieira Júnior" → "vieira": the surname for sorting, without accents or case. */
    public static function surname(?string $name): string
    {
        $words = preg_split('/\s+/', Book::normalizeSearch($name ?? ''), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        while (count($words) > 1 && in_array(end($words), self::GENERATIONAL_SUFFIXES, true)) {
            array_pop($words);
        }

        return (string) array_pop($words);
    }

    /** "Itamar Vieira Júnior" → "Vieira": the surname as printed on a spine. */
    public static function lastName(?string $name): string
    {
        $words = preg_split('/\s+/', trim($name ?? ''), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        while (count($words) > 1 && in_array(Book::normalizeSearch((string) end($words)), self::GENERATIONAL_SUFFIXES, true)) {
            array_pop($words);
        }

        return (string) array_pop($words);
    }
}
