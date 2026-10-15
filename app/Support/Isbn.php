<?php

namespace App\Support;

final class Isbn
{
    /** Tira hífens e espaços e devolve o ISBN-13, ou null se não for um ISBN válido. */
    public static function toIsbn13(string $value): ?string
    {
        $digits = strtoupper((string) preg_replace('/[^0-9Xx]/', '', $value));

        if (strlen($digits) === 13 && self::isValid13($digits)) {
            return $digits;
        }

        if (strlen($digits) === 10 && self::isValid10($digits)) {
            $base = '978'.substr($digits, 0, 9);

            return $base.self::checkDigit13($base);
        }

        return null;
    }

    /** ISBN-10 equivalente, quando existe (só para o prefixo 978). */
    public static function toIsbn10(string $isbn13): ?string
    {
        if (! str_starts_with($isbn13, '978') || strlen($isbn13) !== 13) {
            return null;
        }

        $base = substr($isbn13, 3, 9);
        $sum = 0;

        for ($i = 0; $i < 9; $i++) {
            $sum += (int) $base[$i] * (10 - $i);
        }

        $check = (11 - $sum % 11) % 11;

        return $base.($check === 10 ? 'X' : (string) $check);
    }

    /** Edição brasileira: prefixos 978-85 e 978-65. */
    public static function isBrazilian(string $isbn13): bool
    {
        return str_starts_with($isbn13, '97885') || str_starts_with($isbn13, '97865');
    }

    private static function isValid13(string $digits): bool
    {
        return ctype_digit($digits)
            && self::checkDigit13(substr($digits, 0, 12)) === $digits[12];
    }

    private static function isValid10(string $digits): bool
    {
        if (! ctype_digit(substr($digits, 0, 9))) {
            return false;
        }

        $sum = 0;

        for ($i = 0; $i < 10; $i++) {
            $digit = $digits[$i] === 'X' ? 10 : (int) $digits[$i];

            if ($digits[$i] === 'X' && $i !== 9) {
                return false;
            }

            $sum += $digit * (10 - $i);
        }

        return $sum % 11 === 0;
    }

    private static function checkDigit13(string $first12): string
    {
        $sum = 0;

        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $first12[$i] * ($i % 2 === 0 ? 1 : 3);
        }

        return (string) ((10 - $sum % 10) % 10);
    }
}
