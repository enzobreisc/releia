<?php

namespace App\Support;

use App\Enums\Locale;
use Carbon\CarbonInterface;

final class DateLabel
{
    public static function shortDate(CarbonInterface $date): string
    {
        return $date->translatedFormat(self::isEnglish() ? 'M j' : 'j M');
    }

    public static function monthYear(CarbonInterface $date): string
    {
        return $date->translatedFormat('M Y');
    }

    public static function monthAbbreviation(int $month): string
    {
        return now()->setDate(2000, $month, 1)->translatedFormat('M');
    }

    public static function monthName(int $month): string
    {
        return now()->setDate(2000, $month, 1)->translatedFormat('F');
    }

    private static function isEnglish(): bool
    {
        return app()->getLocale() === Locale::En->value;
    }
}
