<?php

namespace App\Enums;

/** Shelf the book is on, from its most recent reading. */
enum ReadingStatus: string
{
    case WantToRead = 'want_to_read';
    case Reading = 'reading';
    case Read = 'read';
    case Abandoned = 'abandoned';

    public function label(): string
    {
        return match ($this) {
            self::WantToRead => __('Quero ler'),
            self::Reading => __('Lendo'),
            self::Read => __('Lido'),
            self::Abandoned => __('Abandonado'),
        };
    }

    /** Tab label in the Library. */
    public function shelfLabel(): string
    {
        return match ($this) {
            self::WantToRead => __('Quero ler'),
            self::Reading => __('Lendo'),
            self::Read => __('Lidos'),
            self::Abandoned => __('Abandonados'),
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $status) => ['value' => $status->value, 'label' => $status->label()],
            self::cases(),
        );
    }
}
