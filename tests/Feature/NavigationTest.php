<?php

use Inertia\Testing\AssertableInertia as Assert;

test('cada tela abre com o componente certo', function (string $route, string $component) {
    $this->get(route($route))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    ['home', 'home'],
    ['library.index', 'library'],
    ['books.create', 'add-book'],
    ['notes.index', 'notes'],
    ['queue.index', 'queue'],
    ['profile.show', 'profile'],
    ['stats.index', 'stats'],
    ['wrapped.show', 'wrapped'],
    ['suggestions.index', 'suggestions'],
]);
