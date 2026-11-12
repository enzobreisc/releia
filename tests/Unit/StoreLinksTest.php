<?php

use App\Support\StoreLinks;
use Tests\TestCase;

uses(TestCase::class);

test('links to the exact edition when the ISBN is known', function (string $store, string $expected) {
    expect(StoreLinks::url($store, '9788535933390', 'Torto Arado', 'Itamar Vieira Junior'))->toBe($expected);
})->with([
    'amazon' => ['amazon', 'https://www.amazon.com.br/s?k=9788535933390&i=stripbooks'],
    'estante virtual' => ['estante_virtual', 'https://www.estantevirtual.com.br/busca?q=9788535933390'],
    'mercado livre' => ['mercado_livre', 'https://lista.mercadolivre.com.br/9788535933390'],
    'buscapé' => ['buscape', 'https://www.buscape.com.br/search?q=9788535933390'],
    'americanas' => ['americanas', 'https://www.americanas.com.br/busca/9788535933390'],
]);

test('falls back to title and author when the ISBN is unknown', function (string $store, string $expected) {
    expect(StoreLinks::url($store, null, 'Torto Arado', 'Itamar Vieira Junior'))->toBe($expected);
})->with([
    'amazon' => ['amazon', 'https://www.amazon.com.br/s?k=Torto+Arado+Itamar+Vieira+Junior&i=stripbooks'],
    'estante virtual' => ['estante_virtual', 'https://www.estantevirtual.com.br/busca?q=Torto+Arado+Itamar+Vieira+Junior'],
    'mercado livre' => ['mercado_livre', 'https://lista.mercadolivre.com.br/torto-arado-itamar-vieira-junior'],
    'buscapé' => ['buscape', 'https://www.buscape.com.br/search?q=Torto+Arado+Itamar+Vieira+Junior'],
    'americanas' => ['americanas', 'https://www.americanas.com.br/busca/Torto%20Arado%20Itamar%20Vieira%20Junior'],
]);

test('falls back to the title alone when there is no author', function () {
    expect(StoreLinks::url('amazon', null, 'Torto Arado'))->toBe('https://www.amazon.com.br/s?k=Torto+Arado&i=stripbooks');
});

test('url-encodes accents and symbols in the title fallback', function (string $store, string $expected) {
    expect(StoreLinks::url($store, null, 'Memórias & Afeto'))->toBe($expected);
})->with([
    'estante virtual' => ['estante_virtual', 'https://www.estantevirtual.com.br/busca?q=Mem%C3%B3rias+%26+Afeto'],
    'buscapé' => ['buscape', 'https://www.buscape.com.br/search?q=Mem%C3%B3rias+%26+Afeto'],
    'americanas' => ['americanas', 'https://www.americanas.com.br/busca/Mem%C3%B3rias%20%26%20Afeto'],
]);

test('slugs the title into the Mercado Livre path without accents', function () {
    expect(StoreLinks::url('mercado_livre', null, 'Memórias Afeto'))->toBe('https://lista.mercadolivre.com.br/memorias-afeto');
});

test('returns no link for an unknown store', function () {
    expect(StoreLinks::url('submarino', '9788535933390', 'Torto Arado'))->toBeNull();
});

test('lists the five stores in display order', function () {
    expect(StoreLinks::keys())->toBe(['amazon', 'estante_virtual', 'mercado_livre', 'buscape', 'americanas']);
});

test('builds one labelled link per store in display order', function () {
    $links = StoreLinks::all('9788535933390', 'Torto Arado');

    expect(array_column($links, 'key'))->toBe(StoreLinks::keys())
        ->and(array_column($links, 'label'))->toContain('Buscapé (comparar preços)')
        ->and(array_column($links, 'url'))->each->toStartWith('https://');
});
