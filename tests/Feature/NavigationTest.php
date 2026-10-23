<?php

use Inertia\Testing\AssertableInertia as Assert;

test('cada tela abre com o componente certo', function (string $route, string $component) {
    $this->get(route($route))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    ['home', 'home'],
    ['library.index', 'library'],
    ['authors.index', 'authors'],
    ['timeline.index', 'timeline'],
    ['books.create', 'add-book'],
    ['queue.index', 'queue'],
    ['shopping.index', 'shopping'],
    ['profile.show', 'profile'],
    ['stats.index', 'stats'],
    ['wrapped.show', 'wrapped'],
    ['suggestions.index', 'suggestions'],
    ['quick-log', 'quick-log'],
]);
