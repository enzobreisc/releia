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

test('author written as "Surname, Given names" matches the given-names order', function () {
    expect(BookIdentity::keys('The Picture of Dorian Gray', ['WILDE, OSCAR']))
        ->toBe(BookIdentity::keys('The Picture of Dorian Gray', ['Oscar Wilde']));
});

test('a generational suffix after the comma keeps the author order', function (string $author, string $expectedAuthorKey) {
    expect(BookIdentity::keys('Torto Arado', [$author]))->toBe(['title-author:torto arado|'.$expectedAuthorKey]);
})->with([
    ['Silva, Jr.', 'silva jr'],
    ['Silva, Júnior', 'silva junior'],
    ['Silva, Junior', 'silva junior'],
    ['Silva, Filho', 'silva filho'],
    ['Silva, Neto', 'silva neto'],
    ['Silva, Sobrinho', 'silva sobrinho'],
    ['Silva, Sr', 'silva sr'],
    ['Silva, II', 'silva ii'],
    ['Silva, III', 'silva iii'],
]);

test('author without a comma, or with more than one comma, keeps its order', function (string $author, string $expectedAuthorKey) {
    expect(BookIdentity::keys('Torto Arado', [$author]))->toBe(['title-author:torto arado|'.$expectedAuthorKey]);
})->with([
    ['Oscar Wilde', 'oscar wilde'],
    ['WILDE, OSCAR, JR', 'wilde oscar jr'],
]);

test('parênteses no título não atrapalham a comparação', function () {
    expect(BookIdentity::normalizeTitle('Memorial de Aires (Clássicos da Literatura Brasileira)'))
        ->toBe('memorial de aires');
});

test('artigos no começo ou invertidos no fim do título não atrapalham a comparação', function (string $title) {
    expect(BookIdentity::normalizeTitle($title))->toBe('morte de ivan ilitch');
})->with([
    'Morte De Ivan Ilitch, A',
    'A Morte de Ivan Ilitch',
    'Morte de Ivan Ilitch',
]);

test('um título que é só o artigo continua valendo', function () {
    expect(BookIdentity::normalizeTitle('O'))->toBe('o');
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
