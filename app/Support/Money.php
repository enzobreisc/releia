<?php

namespace App\Support;

use App\Enums\Locale;

final class Money
{
    /**
     * No floats: the number is built from the digits, so there is no rounding error.
     */
    public static function parseReais(?string $value): ?int
    {
        $value = trim(str_replace(['R$', ' ', "\u{a0}"], '', (string) $value));

        if ($value === '') {
            return null;
        }

        // The last separator is the decimal one: "1.234,56" (pt-BR) and "1,234.56" (en) are both 1234.56.
        if (str_contains($value, ',')) {
            $value = strrpos($value, '.') > strrpos($value, ',')
                ? str_replace(',', '', $value)
                : str_replace(['.', ','], ['', '.'], $value);
        }

        if (preg_match('/^\d+(\.\d{1,2})?$/', $value) !== 1) {
            return null;
        }

        [$reais, $cents] = array_pad(explode('.', $value, 2), 2, '');
        $cents = str_pad(substr($cents, 0, 2), 2, '0');

        return (int) $reais * 100 + (int) $cents;
    }

    public static function format(int $cents): string
    {
        $isEnglish = app()->getLocale() === Locale::En->value;

        return 'R$ '.number_format($cents / 100, 2, $isEnglish ? '.' : ',', $isEnglish ? ',' : '.');
    }
}
