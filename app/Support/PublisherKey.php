<?php

namespace App\Support;

use App\Models\Book;

/**
 * Publishers appear under several spellings ("Edipro", "EDIPRO", "Editora Rocco", "Lpm Editores"),
 * so spine identity groups them by one normalized key.
 */
final class PublisherKey
{
    private const GENERIC_WORDS = '/\b(editora|editores|editoras)\b(?!\s*\d)|\b(ltda|s\.a\.|do brasil)\b/u';

    /** @var array<string, string> prefix => key, for imprints that carry the parent's name */
    private const IMPRINT_PREFIXES = [
        'penguin' => 'penguin-companhia',
    ];

    /** @var array<string, string> */
    private const ALIASES = [
        'lpm' => 'l&pm',
    ];

    public static function of(?string $publisher): string
    {
        $key = Book::normalizeSearch($publisher ?? '');
        $key = trim((string) preg_replace('/\s+/', ' ', (string) preg_replace(self::GENERIC_WORDS, '', $key)));

        foreach (self::IMPRINT_PREFIXES as $prefix => $imprint) {
            if (str_starts_with($key, $prefix)) {
                return $imprint;
            }
        }

        return self::ALIASES[$key] ?? $key;
    }
}
