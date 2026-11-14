<?php

use App\Support\AuthorName;
use App\Support\PublisherKey;

test('spellings of one publisher share a key', function (?string $name, string $key) {
    expect(PublisherKey::of($name))->toBe($key);
})->with([
    'case' => ['EDIPRO', 'edipro'],
    'plain' => ['Edipro', 'edipro'],
    'editora prefix' => ['Editora Rocco', 'rocco'],
    'a number after editora is part of the name' => ['Editora 34', 'editora 34'],
    'lowercase editora 34' => ['editora 34', 'editora 34'],
    'alias' => ['Lpm Editores', 'l&pm'],
    'imprint of a parent' => ['Penguin-Companhia das Letras', 'penguin-companhia'],
    'regional suffix' => ['Editora Planeta do Brasil', 'planeta'],
    'accents' => ['Intrínseca', 'intrinseca'],
    'no publisher' => [null, ''],
]);

test('the spine surname drops generational suffixes and keeps the accent', function (string $name, string $surname) {
    expect(AuthorName::lastName($name))->toBe($surname);
})->with([
    ['Fiódor Dostoiévski', 'Dostoiévski'],
    ['Itamar Vieira Júnior', 'Vieira'],
    ['Madonna', 'Madonna'],
]);
