<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Chaves que identificam um livro entre fontes diferentes. A busca devolve obras
 * com várias edições, então ISBN sozinho não basta: também comparamos título e autor.
 */
final class BookIdentity
{
    /**
     * @param  list<string>  $authors
     * @return list<string>
     */
    public static function keys(string $title, array $authors, ?string $isbn13 = null, ?string $isbn10 = null): array
    {
        $keys = [];

        foreach ([$isbn13, $isbn10] as $isbn) {
            if ($isbn !== null && $isbn !== '') {
                // ISBN-10 e ISBN-13 do mesmo livro viram a mesma chave.
                $keys[] = 'isbn:'.(Isbn::toIsbn13($isbn) ?? $isbn);
            }
        }

        // Sem autor a chave só vale para o título; ainda assim evita duplicatas óbvias.
        $author = self::normalize($authors[0] ?? '');
        $keys[] = 'title-author:'.self::normalizeTitle($title).'|'.$author;

        return $keys;
    }

    /**
     * Título sem subtítulo e sem parênteses: "Memorial de Aires (Clássicos...)" vira "memorial de aires".
     */
    public static function normalizeTitle(string $title): string
    {
        return self::normalize((string) preg_replace('/\(.*?\)|:.*$/', '', $title));
    }

    /** Minúsculas, sem acento e sem pontuação. */
    public static function normalize(string $value): string
    {
        return Str::of($value)->ascii()->lower()->replaceMatches('/[^a-z0-9 ]+/', ' ')->squish()->toString();
    }
}
