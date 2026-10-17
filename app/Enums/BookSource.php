<?php

namespace App\Enums;

/** De onde vieram os metadados do livro. */
enum BookSource: string
{
    case OpenLibrary = 'open_library';
    case GoogleBooks = 'google_books';
    case BrasilApi = 'brasil_api';
    case Manual = 'manual';

    public function label(): string
    {
        return match ($this) {
            self::OpenLibrary => 'Open Library',
            self::GoogleBooks => 'Google Books',
            self::BrasilApi => 'BrasilAPI',
            self::Manual => 'Manual',
        };
    }
}
