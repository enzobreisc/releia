<?php

use Inertia\Testing\AssertableInertia as Assert;

test('cada tela abre com o componente certo', function (string $route, string $component) {
    $this->get(route($route))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    ['inicio', 'inicio'],
    ['biblioteca', 'biblioteca'],
    ['adicionar', 'adicionar'],
    ['notas', 'notas'],
    ['fila', 'fila'],
    ['perfil', 'perfil'],
    ['estatisticas', 'estatisticas'],
    ['wrapped', 'wrapped'],
    ['sugestoes', 'sugestoes'],
    ['quick-log', 'quick-log'],
]);
