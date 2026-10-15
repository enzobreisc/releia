<?php

use App\Support\Isbn;

test('normaliza ISBN-13 com hífens', function () {
    expect(Isbn::toIsbn13('978-65-80309-31-3'))->toBe('9786580309313');
});

test('converte ISBN-10 em ISBN-13', function () {
    expect(Isbn::toIsbn13('8535933395'))->toBe('9788535933390');
});

test('aceita X no dígito verificador do ISBN-10', function () {
    expect(Isbn::toIsbn13('043942089X'))->toBe('9780439420891');
});

test('recusa dígito verificador errado e texto comum', function (string $value) {
    expect(Isbn::toIsbn13($value))->toBeNull();
})->with(['9786580309310', 'torto arado', '12345']);

test('gera o ISBN-10 só para o prefixo 978', function () {
    expect(Isbn::toIsbn10('9788535933390'))->toBe('8535933395')
        ->and(Isbn::toIsbn10('9791032305690'))->toBeNull();
});

test('reconhece edições brasileiras', function () {
    expect(Isbn::isBrazilian('9786580309313'))->toBeTrue()
        ->and(Isbn::isBrazilian('9788535933390'))->toBeTrue()
        ->and(Isbn::isBrazilian('9780136083221'))->toBeFalse();
});
