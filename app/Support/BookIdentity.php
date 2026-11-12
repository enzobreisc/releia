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
        $author = self::normalize($authors[0] ?? '');
        $keys[] = 'title-author:'.self::normalizeTitle($title).'|'.$author;

        return $keys;
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
