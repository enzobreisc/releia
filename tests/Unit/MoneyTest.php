<?php

use App\Enums\Locale;
use App\Support\Money;
use Tests\TestCase;

uses(TestCase::class);

test('parses a pt-BR decimal comma with a thousands dot', function () {
    expect(Money::parseReais('1.234,56'))->toBe(123456);
});

test('parses an en decimal point with a thousands comma', function () {
    expect(Money::parseReais('1,234.56'))->toBe(123456);
});

test('parses amounts typed with a currency prefix, spaces or decimal separators', function (string $value, int $cents) {
    expect(Money::parseReais($value))->toBe($cents);
})->with([
    'decimal comma' => ['34,90', 3490],
    'decimal point' => ['34.90', 3490],
    'whole number' => ['10', 1000],
    'one decimal digit' => ['12.5', 1250],
    'currency prefix' => ['R$ 5,5', 550],
    'non-breaking space' => ["R$\u{a0}34,90", 3490],
]);

test('rejects text, empty input and amounts with more than two decimal digits', function (string $value) {
    expect(Money::parseReais($value))->toBeNull();
})->with(['', 'abc', 'R$', '1,2,3', '5,555']);

test('treats a missing amount as null', function () {
    expect(Money::parseReais(null))->toBeNull();
});

test('formats cents with a pt-BR decimal comma and thousands dot', function () {
    app()->setLocale(Locale::PtBr->value);

    expect(Money::format(123456))->toBe('R$ 1.234,56')
        ->and(Money::format(3490))->toBe('R$ 34,90')
        ->and(Money::format(5))->toBe('R$ 0,05');
});

test('formats cents with an English decimal point and thousands comma', function () {
    app()->setLocale(Locale::En->value);

    expect(Money::format(123456))->toBe('R$ 1,234.56')
        ->and(Money::format(3490))->toBe('R$ 34.90')
        ->and(Money::format(5))->toBe('R$ 0.05');
});
