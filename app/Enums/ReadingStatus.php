<?php

namespace App\Enums;

/** Estante em que o livro está, pela leitura mais recente. */
enum ReadingStatus: string
{
    case WantToRead = 'want_to_read';
    case Reading = 'reading';
    case Read = 'read';
    case Abandoned = 'abandoned';

    public function label(): string
    {
        return match ($this) {
            self::WantToRead => 'Quero ler',
            self::Reading => 'Lendo',
            self::Read => 'Lido',
            self::Abandoned => 'Abandonado',
        };
    }

    /** Rótulo da aba na Biblioteca. */
    public function shelfLabel(): string
    {
        return match ($this) {
            self::WantToRead => 'Quero ler',
            self::Reading => 'Lendo',
            self::Read => 'Lidos',
            self::Abandoned => 'Abandonados',
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
