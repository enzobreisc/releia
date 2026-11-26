<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Keys that identify a book across sources. Searches return works with many
 * editions, so the ISBN alone is not enough: title and author are compared too.
 */
final class BookIdentity
{
    private const ARTICLES = 'a|o|as|os|um|uma|uns|umas|the|an';

    private const GENERATIONAL_SUFFIXES = ['jr', 'junior', 'filho', 'neto', 'sobrinho', 'sr', 'ii', 'iii'];

    /**
     * @param  list<string>  $authors
     * @return list<string>
     */
    public static function keys(string $title, array $authors, ?string $isbn13 = null, ?string $isbn10 = null): array
    {
        $keys = [];

        foreach ([$isbn13, $isbn10] as $isbn) {
            if ($isbn !== null && $isbn !== '') {
                $keys[] = 'isbn:'.(Isbn::toIsbn13($isbn) ?? $isbn);
            }
        }

        // Without an author the key only covers the title, which still catches obvious duplicates.
        $author = self::normalize(self::givenNamesFirst($authors[0] ?? ''));
        $keys[] = 'title-author:'.self::normalizeTitle($title).'|'.$author;

        return $keys;
    }

    /**
     * Brazilian catalogs list authors as "Surname, Given names", so "WILDE, OSCAR" becomes "OSCAR WILDE".
     * A comma followed by a generational suffix ("Silva, Jr") is a name part, not a reversed name.
     */
    public static function givenNamesFirst(string $author): string
    {
        $parts = array_map(trim(...), explode(',', $author));

        if (count($parts) !== 2 || in_array('', $parts, true) || in_array(self::normalize($parts[1]), self::GENERATIONAL_SUFFIXES, true)) {
            return $author;
        }

        return $parts[1].' '.$parts[0];
    }

    /**
     * Catalogs often move the article to the end ("Morte De Ivan Ilitch, A"), so it is stripped from both positions.
     */
    public static function normalizeTitle(string $title): string
    {
        $withoutSubtitle = (string) preg_replace('/\(.*?\)|:.*$/', '', $title);
        $withoutTrailingArticle = (string) preg_replace('/,\s*('.self::ARTICLES.')\s*$/i', '', $withoutSubtitle);

        return (string) preg_replace('/^('.self::ARTICLES.')\s+(?=\S)/', '', self::normalize($withoutTrailingArticle));
    }

    public static function normalize(string $value): string
    {
        return Str::of($value)->ascii()->lower()->replaceMatches('/[^a-z0-9 ]+/', ' ')->squish()->toString();
    }
}
