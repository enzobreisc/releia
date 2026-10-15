<?php

namespace App\Enums;

/** Situação de uma sugestão. As descartadas ficam guardadas só para não voltarem. */
enum RecommendationStatus: string
{
    case New = 'new';
    case WantToRead = 'want_to_read';
    case Dismissed = 'dismissed';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Nova',
            self::WantToRead => 'Quero ler',
            self::Dismissed => 'Descartada',
        };
    }
}
