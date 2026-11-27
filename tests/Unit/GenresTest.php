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

test('lists the catalog genres', function () {
    expect(Genres::names())->toContain('Poesia', 'Romance');
});
