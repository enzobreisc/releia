<?php

namespace App\Enums;

/** Where the book's metadata came from. */
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
            self::Manual => __('Manual'),
        };
    }
}
