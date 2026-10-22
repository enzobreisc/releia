<?php

namespace App\Enums;

/** Kind of note: a copied excerpt, the reader's own reflection or a quote. */
enum NoteKind: string
{
    case Excerpt = 'excerpt';
    case Reflection = 'reflection';
    case Quote = 'quote';

    public function label(): string
    {
        return match ($this) {
            self::Excerpt => __('Trecho'),
            self::Reflection => __('Reflexão'),
            self::Quote => __('Citação'),
        };
    }

    /** Filter tab label, in the plural. */
    public function pluralLabel(): string
    {
        return match ($this) {
            self::Excerpt => __('Trechos'),
            self::Reflection => __('Reflexões'),
            self::Quote => __('Citações'),
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
