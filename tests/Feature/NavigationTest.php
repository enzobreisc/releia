<?php

use Inertia\Testing\AssertableInertia as Assert;

test('cada tela abre com o componente certo', function (string $route, string $component) {
    $this->get(route($route))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    ['inicio', 'home'],
    ['biblioteca', 'library'],
    ['adicionar', 'add-book'],
    ['notas', 'notes'],
    ['fila', 'queue'],
    ['perfil', 'profile'],
    ['estatisticas', 'stats'],
    ['wrapped', 'wrapped'],
    ['sugestoes', 'suggestions'],
]);
