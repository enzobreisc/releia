<?php

namespace App\Support;

use App\Enums\Locale;
use Carbon\CarbonInterface;

final class DateLabel
{
    /** "14 out" in Portuguese, "Oct 14" in English. */
    public static function shortDate(CarbonInterface $date): string
    {
        return $date->translatedFormat(self::isEnglish() ? 'M j' : 'j M');
    }

    /** "out 2026" in Portuguese, "Oct 2026" in English. */
    public static function monthYear(CarbonInterface $date): string
    {
        return $date->translatedFormat('M Y');
    }

    /** "mar" in Portuguese, "Mar" in English. */
    public static function monthAbbreviation(int $month): string
    {
        return now()->setDate(2000, $month, 1)->translatedFormat('M');
    }

    /** "março" in Portuguese, "March" in English. */
    public static function monthName(int $month): string
    {
        return now()->setDate(2000, $month, 1)->translatedFormat('F');
    }

    private static function isEnglish(): bool
    {
        return app()->getLocale() === Locale::En->value;
    }
}
