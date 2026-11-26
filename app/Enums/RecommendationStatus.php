<?php

namespace App\Enums;

/**
 * Dismissed suggestions are kept so they never come back; expired ones, pushed out of the pending
 * list, so only a few come back per search.
 */
enum RecommendationStatus: string
{
    case New = 'new';
    case WantToRead = 'want_to_read';
    case Dismissed = 'dismissed';
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::New => __('Nova'),
            self::WantToRead => __('Quero ler'),
            self::Dismissed => __('Descartada'),
            self::Expired => __('Expirada'),
        };
    }
}
