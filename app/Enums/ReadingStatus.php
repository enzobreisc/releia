<?php

namespace App\Enums;

/** Estante em que o livro está, pela leitura mais recente. */
enum ReadingStatus: string
{
    case QueroLer = 'quero_ler';
    case Lendo = 'lendo';
    case Lido = 'lido';
    case Abandonado = 'abandonado';

    public function label(): string
    {
        return match ($this) {
            self::QueroLer => 'Quero ler',
            self::Lendo => 'Lendo',
            self::Lido => 'Lido',
            self::Abandonado => 'Abandonado',
        };
    }

    /** Rótulo da aba na Biblioteca. */
    public function shelfLabel(): string
    {
        return match ($this) {
            self::QueroLer => 'Quero ler',
            self::Lendo => 'Lendo',
            self::Lido => 'Lidos',
            self::Abandonado => 'Abandonados',
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
