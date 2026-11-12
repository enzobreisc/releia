<?php

use App\Enums\Locale;
use App\Support\Ordinal;
use Tests\TestCase;

uses(TestCase::class);

test('English ordinals use st, nd, rd and th, including the 11-13 exceptions', function (int $number, string $expected) {
    app()->setLocale(Locale::En->value);

    expect(Ordinal::masculine($number))->toBe($expected);
})->with([
    '1st' => [1, '1st'],
    '2nd' => [2, '2nd'],
    '3rd' => [3, '3rd'],
    '4th' => [4, '4th'],
    '11th' => [11, '11th'],
    '12th' => [12, '12th'],
    '13th' => [13, '13th'],
    '21st' => [21, '21st'],
    '22nd' => [22, '22nd'],
]);

test('English feminine ordinals match the masculine ones', function () {
    app()->setLocale(Locale::En->value);

    expect(Ordinal::feminine(22))->toBe('22nd')
        ->and(Ordinal::feminine(11))->toBe('11th');
});

test('pt-BR ordinals use º for masculine nouns and ª for feminine ones', function () {
    app()->setLocale(Locale::PtBr->value);

    expect(Ordinal::masculine(1))->toBe('1º')
        ->and(Ordinal::masculine(22))->toBe('22º')
        ->and(Ordinal::feminine(1))->toBe('1ª');
});
