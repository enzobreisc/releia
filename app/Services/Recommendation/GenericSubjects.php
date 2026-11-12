<?php

namespace App\Services\Recommendation;

use App\Support\BookIdentity;

/**
 * Open Library subjects that do not help match similar books: "Fiction" and "Accidents"
 * match almost everything. The filter is deliberately simple; the list grows with use.
 */
final class GenericSubjects
{
    private const GENERIC = [
        'fiction',
        'fiction general',
        'fiction in english',
        'literature',
        'accidents',
        'families',
        'juvenile fiction',
        'large type books',
        'translations',
        'translations into english',
        'english language',
        'portuguese language',
        'spanish language books',
        'open library staff picks',
        'accessible book',
        'protected daisy',
        'in library',
        'ficcao',
        'ficcion',
    ];

    public static function isUseful(?string $subject): bool
    {
        if ($subject === null || trim($subject) === '') {
            return false;
        }

        // Open Library prefixes markers such as "nyt:..." and "series:..." that are not subjects.
        if (str_contains($subject, ':')) {
            return false;
        }

        $normalized = BookIdentity::normalize($subject);

        return strlen($normalized) >= 4 && ! in_array($normalized, self::GENERIC, true);
    }
}
