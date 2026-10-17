<?php

use App\Support\Genres;

test('escolhe o gênero do catálogo que mais aparece nos assuntos', function (array $subjects, ?string $expected) {
    expect(Genres::fromSubjects($subjects))->toBe($expected);
})->with([
    'realismo mágico é romance, não fantasia' => [['Magic realism (Literature)', 'Accidents', 'Domestic fiction', 'fiction', 'novels'], 'Romance'],
    'categoria do Google em partes' => [['Fiction / Science Fiction / General'], 'Ficção científica'],
    'assuntos em português' => [['provação', 'Evangelho', 'Bíblia', 'Igreja'], 'Religião e espiritualidade'],
    'infantojuvenil vence ficção' => [['Juvenile Fiction', 'Fantasy fiction'], 'Infantojuvenil'],
    'categorias da CBL separadas por ponto e vírgula' => [['Meio ambiente; Conservação e Proteção'], 'Ciências'],
    'ruído sem gênero fica sem gênero' => [['Accidents', 'Families', 'sisters'], null],
    'sem assuntos' => [[], null],
    'ignora o que não é texto' => [[null, 12, ['x']], null],
]);

test('só gêneros do catálogo têm assunto para sugestões', function () {
    expect(Genres::openLibrarySubject('Ficção científica'))->toBe('Science fiction')
        ->and(Genres::openLibrarySubject('Romance'))->toBeNull()
        ->and(Genres::openLibrarySubject('Texto digitado'))->toBeNull()
        ->and(Genres::openLibrarySubject(null))->toBeNull()
        ->and(Genres::names())->toContain('Poesia', 'Romance');
});
