<?php

namespace App\Enums;

enum Locale: string
{
    case PtBr = 'pt_BR';
    case En = 'en';

    public const SETTING = 'locale';

    /** Language tag for Intl and the HTML lang attribute. */
    public function languageTag(): string
    {
        return match ($this) {
            self::PtBr => 'pt-BR',
            self::En => 'en-US',
        };
    }

    /** Always in its own language, so it can be found whatever the current one is. */
    public function nativeName(): string
    {
        return match ($this) {
            self::PtBr => 'Português (Brasil)',
            self::En => 'English',
        };
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function options(): array
    {
        return array_map(
            fn (self $locale) => ['value' => $locale->value, 'label' => $locale->nativeName()],
            self::cases(),
        );
    }
}
