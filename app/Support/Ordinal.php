<?php

namespace App\Support;

use App\Enums\Locale;

final class Ordinal
{
    /** "1º" for things like queue positions; "1st" in English. */
    public static function masculine(int $number): string
    {
        return self::isEnglish() ? self::english($number) : $number.'º';
    }

    /** "1ª" for feminine nouns like "leitura"; "1st" in English. */
    public static function feminine(int $number): string
    {
        return self::isEnglish() ? self::english($number) : $number.'ª';
    }

    private static function english(int $number): string
    {
        $suffix = match (true) {
            in_array($number % 100, [11, 12, 13], true) => 'th',
            $number % 10 === 1 => 'st',
            $number % 10 === 2 => 'nd',
            $number % 10 === 3 => 'rd',
            default => 'th',
        };

        return $number.$suffix;
    }

    private static function isEnglish(): bool
    {
        return app()->getLocale() === Locale::En->value;
    }
}
