<?php

namespace App\Services\BookLookup;

use App\Models\Book;
use App\Support\Isbn;
use Illuminate\Support\Str;
use Nicebooks\Isbn\Exception\IsbnException;
use Nicebooks\Isbn\Isbn as NicebooksIsbn;

/**
 * The publishers in your library, weighted by how many of your books each one has. Editions are matched
 * by publisher name or, since search results carry only ISBNs, by the ISBN registrant.
 */
final class PreferredPublishers
{
    private const GENERIC_WORDS = '/\b(editora|editorial|edicoes|ed)\b/';

    /**
     * Brazilian editions stay first; among them, your publishers come before the others. The sort is
     * stable, so editions that tie keep their order.
     *
     * @param  list<BookCandidate>  $editions
     * @return list<BookCandidate>
     */
    public function sort(array $editions): array
    {
        $booksByName = $this->booksByName();
        $booksByRegistrant = $this->booksByRegistrant();
        $rank = fn (BookCandidate $edition): array => [
            Isbn::isBrazilian((string) $edition->isbn13),
            max(
                $booksByName[self::normalize($edition->publisher)] ?? 0,
                $booksByRegistrant[self::registrantOf($edition->isbn13)] ?? 0,
            ),
        ];

        usort($editions, fn (BookCandidate $a, BookCandidate $b): int => $rank($b) <=> $rank($a));

        return $editions;
    }

    /**
     * @param  list<string>  $isbns
     * @return list<string>
     */
    public function sortIsbns(array $isbns): array
    {
        $booksByRegistrant = $this->booksByRegistrant();
        $rank = fn (string $isbn): int => $booksByRegistrant[self::registrantOf($isbn)] ?? 0;

        usort($isbns, fn (string $a, string $b): int => $rank($b) <=> $rank($a));

        return $isbns;
    }

    /**
     * @return array<string, int>
     */
    private function booksByName(): array
    {
        return Book::query()->whereNotNull('publisher')->pluck('publisher')
            ->map(fn (string $publisher): string => self::normalize($publisher))
            ->filter()
            ->countBy()
            ->all();
    }

    /**
     * @return array<string, int>
     */
    private function booksByRegistrant(): array
    {
        return Book::query()->whereNotNull('isbn_13')->pluck('isbn_13')
            ->map(fn (string $isbn): string => self::registrantOf($isbn))
            ->filter()
            ->countBy()
            ->all();
    }

    /** The prefix, group and publisher elements ("978-85-7326"), or an empty string for an unknown range. */
    private static function registrantOf(?string $isbn): string
    {
        try {
            $parsed = NicebooksIsbn::of($isbn ?? '');

            return $parsed->isValid() ? implode('-', array_slice($parsed->getParts(), 0, 3)) : '';
        } catch (IsbnException) {
            return '';
        }
    }

    /** "Editora 34", "editora 34" and "Ed. 34" are the same publisher. */
    private static function normalize(?string $publisher): string
    {
        return Str::of($publisher ?? '')->ascii()->lower()
            ->replaceMatches('/[^a-z0-9 ]+/', ' ')
            ->replaceMatches(self::GENERIC_WORDS, ' ')
            ->squish()
            ->toString();
    }
}
