<?php

namespace App\Enums;

/** Tipo da nota: trecho copiado, reflexão própria ou citação. */
enum NoteKind: string
{
    case Excerpt = 'excerpt';
    case Reflection = 'reflection';
    case Quote = 'quote';

    public function label(): string
    {
        return match ($this) {
            self::Excerpt => 'Trecho',
            self::Reflection => 'Reflexão',
            self::Quote => 'Citação',
        };
    }

    /** Rótulo da aba de filtro, no plural. */
    public function pluralLabel(): string
    {
        return match ($this) {
            self::Excerpt => 'Trechos',
            self::Reflection => 'Reflexões',
            self::Quote => 'Citações',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $kind) => ['value' => $kind->value, 'label' => $kind->label()],
            self::cases(),
        );
    }
}
