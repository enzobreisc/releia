<?php

namespace App\Enums;

/** Dismissed suggestions are kept only so they do not come back. */
enum RecommendationStatus: string
{
    case New = 'new';
    case WantToRead = 'want_to_read';
    case Dismissed = 'dismissed';

    public function label(): string
    {
        return match ($this) {
            self::New => __('Nova'),
            self::WantToRead => __('Quero ler'),
            self::Dismissed => __('Descartada'),
        };
    }
}
