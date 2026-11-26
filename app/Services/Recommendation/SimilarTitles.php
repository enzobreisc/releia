<?php

namespace App\Services\Recommendation;

use App\Models\Author;
use App\Models\Book;
use App\Support\BookIdentity;

/**
 * Catalogs misspell titles ("Os irmaos Karanazov"), which exact identity keys miss, so a book you own
 * is also recognized by a nearly equal title from the same author.
 */
final class SimilarTitles
{
    /** One wrong letter in a short title already falls below this, so only long titles tolerate typos. */
    private const MIN_SIMILARITY_PERCENT = 90.0;

    /**
     * @return list<array{title: string, author: string}>
     */
    public function owned(): array
    {
        return array_values(Book::query()->with('authors')->get()
            ->flatMap(fn (Book $book) => $book->authors->map(fn (Author $author): array => [
                'title' => BookIdentity::normalizeTitle($book->title),
                'author' => self::normalizeAuthor($author->name),
            ]))
            ->all());
    }

    /**
     * @param  list<string>  $authors
     * @param  list<array{title: string, author: string}>  $owned
     */
    public function isOwned(string $title, array $authors, array $owned): bool
    {
        $wanted = BookIdentity::normalizeTitle($title);
        $authorNames = array_map(self::normalizeAuthor(...), $authors);

        foreach ($owned as $book) {
            if (in_array($book['author'], $authorNames, true) && self::isNearlyEqual($wanted, $book['title'])) {
                return true;
            }
        }

        return false;
    }

    private static function isNearlyEqual(string $first, string $second): bool
    {
        // Numbers tell volumes apart, however similar the rest of the title is.
        if (self::numbersIn($first) !== self::numbersIn($second)) {
            return false;
        }

        similar_text($first, $second, $percent);

        return $percent >= self::MIN_SIMILARITY_PERCENT;
    }

    /** @return list<string> */
    private static function numbersIn(string $title): array
    {
        preg_match_all('/\b(?:\d+|i{1,3}|iv|vi{0,3}|ix|x)\b/', $title, $matches);

        return $matches[0];
    }

    private static function normalizeAuthor(string $name): string
    {
        return BookIdentity::normalize(BookIdentity::givenNamesFirst($name));
    }
}
