<?php

use App\Enums\Locale;
use App\Support\DateLabel;
use Carbon\CarbonImmutable;
use Tests\TestCase;

uses(TestCase::class);

test('short dates read day then month in Portuguese', function () {
    app()->setLocale(Locale::PtBr->value);

    expect(DateLabel::shortDate(CarbonImmutable::create(2026, 10, 14)))->toBe('14 out');
});

test('short dates read month then day in English', function () {
    app()->setLocale(Locale::En->value);

    expect(DateLabel::shortDate(CarbonImmutable::create(2026, 10, 14)))->toBe('Oct 14');
});

test('month and year labels follow the current locale', function (Locale $locale, string $expected) {
    app()->setLocale($locale->value);

    expect(DateLabel::monthYear(CarbonImmutable::create(2026, 10, 14)))->toBe($expected);
})->with([
    'pt-BR' => [Locale::PtBr, 'out 2026'],
    'en' => [Locale::En, 'Oct 2026'],
]);

test('month abbreviations follow the current locale', function (Locale $locale, string $expected) {
    app()->setLocale($locale->value);

    expect(DateLabel::monthAbbreviation(3))->toBe($expected);
})->with([
    'pt-BR' => [Locale::PtBr, 'mar'],
    'en' => [Locale::En, 'Mar'],
]);

test('month names follow the current locale', function (Locale $locale, string $expected) {
    app()->setLocale($locale->value);

    expect(DateLabel::monthName(3))->toBe($expected);
})->with([
    'pt-BR' => [Locale::PtBr, 'março'],
    'en' => [Locale::En, 'March'],
]);
