<?php

namespace App\Services\Recommendation;

use App\Support\BookIdentity;

/**
 * The one rule that links a name written in a request to an author name in your data: the same name, a name that
 * contains all the words of the request, or an author whose surname is within two letters of the requested one.
 * The surname rule only applies to surnames of five letters or more, so short names need an exact spelling.
 */
final class AuthorNameMatch
{
    private const SIMILAR_SURNAME_MIN_LENGTH = 5;

    private const SIMILAR_SURNAME_DISTANCE = 2;

    public static function matches(string $requested, string $author): bool
    {
        $wanted = BookIdentity::normalize($requested);
        $name = BookIdentity::normalize($author);

        if ($wanted === '' || $name === '') {
            return false;
        }

        if ($wanted === $name) {
            return true;
        }

        $words = explode(' ', $wanted);
        $nameWords = explode(' ', $name);

        return array_diff($words, $nameWords) === []
            || self::isSimilarSurname(end($words), end($nameWords));
    }

    private static function isSimilarSurname(string $surname, string $authorSurname): bool
    {
        return strlen($surname) >= self::SIMILAR_SURNAME_MIN_LENGTH
            && levenshtein($surname, $authorSurname) <= self::SIMILAR_SURNAME_DISTANCE;
    }
}
