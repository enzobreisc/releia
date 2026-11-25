<?php

namespace App\Services\Ai;

use App\Models\Author;
use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use App\Support\Genres;

final class EmbeddingText
{
    private const MAX_CHARS = 512;

    private const PART_SEPARATOR = '. ';

    private const AUTHOR_SEPARATOR = ', ';

    /**
     * The description is left out on purpose: candidates never have one, so including it would
     * make a book with a description look less similar to its own candidate.
     */
    public static function forBook(Book $book): string
    {
        $authors = array_values($book->authors->map(fn (Author $author): string => $author->name)->all());

        return self::compose($book->title, $authors, $book->genre);
    }

    public static function forCandidate(BookCandidate $candidate): string
    {
        return self::compose($candidate->title, $candidate->authors, $candidate->genre);
    }

    public static function hash(string $text, string $prefix): string
    {
        return hash('sha256', $prefix.$text);
    }

    /**
     * @param  list<string>  $authors
     */
    private static function compose(string $title, array $authors, ?string $genre): string
    {
        // The model is English-centric while genres are stored in Portuguese, so the English subject is embedded.
        $subject = Genres::openLibrarySubject($genre) ?? $genre;

        $parts = [
            trim($title),
            trim(implode(self::AUTHOR_SEPARATOR, $authors)),
            trim((string) $subject),
        ];

        $text = implode(self::PART_SEPARATOR, array_filter($parts, fn (string $part) => $part !== ''));

        return mb_substr($text, 0, self::MAX_CHARS);
    }
}
