<?php

namespace App\Services\Recommendation;

use App\Support\BookIdentity;

/**
 * Assuntos da Open Library que não servem para aproximar livros: "Fiction" e "Accidents"
 * casam com quase tudo. Filtro simples de propósito; a lista cresce conforme o uso.
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

    /** Assunto usável para buscar livros parecidos, ou falso se for genérico ou vazio. */
    public static function isUseful(?string $subject): bool
    {
        if ($subject === null || trim($subject) === '') {
            return false;
        }

        // "nyt:...", "series:..." são marcadores da Open Library, não assuntos.
        if (str_contains($subject, ':')) {
            return false;
        }

        $normalized = BookIdentity::normalize($subject);

        return strlen($normalized) >= 4 && ! in_array($normalized, self::GENERIC, true);
    }
}
