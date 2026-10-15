<?php

use App\Services\Recommendation\GenericSubjects;
use App\Support\BookIdentity;

test('ISBN-10 e ISBN-13 do mesmo livro geram a mesma chave', function () {
    $fromIsbn13 = BookIdentity::keys('Torto Arado', [], '9786580309313');
    $fromIsbn10 = BookIdentity::keys('Torto Arado', [], null, '6580309318');

    expect($fromIsbn10)->toContain('isbn:9786580309313')
        ->and($fromIsbn13)->toContain('isbn:9786580309313');
});

test('título e autor são normalizados: acento, caixa e subtítulo', function () {
    $library = BookIdentity::keys('Torto Arado: romance', ['Itamar Vieira Júnior']);
    $candidate = BookIdentity::keys('TORTO ARADO', ['Itamar Vieira Junior', 'Outro']);

    expect(array_intersect($library, $candidate))->toBe(['title-author:torto arado|itamar vieira junior']);
});

test('parênteses no título não atrapalham a comparação', function () {
    expect(BookIdentity::normalizeTitle('Memorial de Aires (Clássicos da Literatura Brasileira)'))
        ->toBe('memorial de aires');
});

test('assuntos genéricos não servem para aproximar livros', function (?string $subject, bool $useful) {
    expect(GenericSubjects::isUseful($subject))->toBe($useful);
})->with([
    ['Fiction', false],
    ['Fiction, general', false],
    ['Accidents', false],
    ['nyt:combined-print-and-e-book-fiction=2020-04-12', false],
    ['Ab', false],
    [null, false],
    ['Magic realism (Literature)', true],
    ['Romance brasileiro', true],
]);
