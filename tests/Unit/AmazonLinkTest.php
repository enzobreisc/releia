<?php

use App\Support\AmazonLink;

test('tira o ISBN do ASIN de links de livro da Amazon', function (string $url) {
    expect(AmazonLink::isbnFromUrl($url))->toBe('9788535933390');
})->with([
    'dp com slug' => 'https://www.amazon.com.br/Livro-Qualquer/dp/8535933395/ref=sr_1_1?keywords=x',
    'gp/product' => 'https://amazon.com.br/gp/product/8535933395',
    'outro país' => 'https://www.amazon.com/dp/8535933395?th=1',
]);

test('ignora links sem ISBN ou de fora da Amazon', function (string $url) {
    expect(AmazonLink::isbnFromUrl($url))->toBeNull();
})->with([
    'ASIN que não é ISBN' => 'https://www.amazon.com.br/dp/B0ABCDEFGH',
    'encurtado' => 'https://amzn.to/3abcdef',
    'outra loja' => 'https://www.estantevirtual.com.br/dp/8535933395',
    'domínio parecido' => 'https://amazon.com.br.example.com/dp/8535933395',
    'texto' => 'Torto Arado',
]);
