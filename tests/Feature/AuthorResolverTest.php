<?php

use App\Models\Book;
use App\Models\ShoppingItem;
use App\Services\Recommendation\AuthorResolver;

function libraryAuthor(string $name): void
{
    Book::factory()->withAuthors([$name])->create();
}

function resolveNames(array $included, array $excluded = []): array
{
    $resolution = app(AuthorResolver::class)->resolve($included, $excluded);

    return [
        'authors' => array_map(fn ($author) => [$author->name, $author->isExact], $resolution->authors),
        'excluded' => $resolution->excludedNames,
    ];
}

test('a name that matches a library author is searched by that author name', function () {
    libraryAuthor('Clarice Lispector');

    expect(resolveNames(['Clarice Lispector']))->toBe([
        'authors' => [['Clarice Lispector', true]],
        'excluded' => [],
    ]);
});

test('a surname finds every author it matches, even when the spelling differs', function () {
    libraryAuthor('Lev Tolstói');
    libraryAuthor('Leo Tolstoy');

    expect(resolveNames(['Tolstoi'])['authors'])->toEqualCanonicalizing([
        ['Lev Tolstói', true],
        ['Leo Tolstoy', true],
    ]);
});

test('a name with a word within two letters of the surname matches a library author', function () {
    libraryAuthor('Fiódor Dostoiévski');

    expect(resolveNames(['Dostoievsky'])['authors'])->toBe([['Fiódor Dostoiévski', true]]);
});

test('a short surname is not matched by similar spelling', function () {
    libraryAuthor('Zoli Lima');

    expect(resolveNames(['Zola'])['authors'])->toBe([['Zola', false]]);
});

test('a name with a word within two letters matches a shopping list author too', function () {
    ShoppingItem::factory()->create(['author' => 'Epitecto']);
    libraryAuthor('Epicteto');

    expect(resolveNames(['Epicteto'])['authors'])->toEqualCanonicalizing([
        ['Epicteto', true],
        ['Epitecto', true],
    ]);
});

test('a name that matches nothing is searched as written and loosely', function () {
    libraryAuthor('Clarice Lispector');

    expect(resolveNames(['Jane Austen'])['authors'])->toBe([['Jane Austen', false]]);
});

test('a name that matches nothing in the library is dropped from the exclusions', function () {
    libraryAuthor('Liev Tolstói');

    expect(resolveNames([], ['russos'])['excluded'])->toBe([]);
});

test('an excluded name is resolved to the library authors it matches', function () {
    libraryAuthor('Machado de Assis');
    libraryAuthor('Assis, Machado de');

    expect(resolveNames([], ['Machado'])['excluded'])->toBe(['Machado de Assis']);
});

test('a name that is both included and excluded ends up excluded', function () {
    libraryAuthor('Machado de Assis');
    libraryAuthor('Clarice Lispector');

    $resolved = resolveNames(['Machado de Assis', 'Clarice Lispector'], ['Machado de Assis']);

    expect($resolved['authors'])->toBe([['Clarice Lispector', true]])
        ->and($resolved['excluded'])->toBe(['Machado de Assis']);
});

test('the same author named twice is searched once', function () {
    libraryAuthor('Clarice Lispector');
    ShoppingItem::factory()->create(['author' => 'Clarice Lispector']);

    expect(resolveNames(['Clarice Lispector', 'Clarice'])['authors'])->toBe([['Clarice Lispector', true]]);
});

test('a catalog name written surname first is matched by its given-names order', function () {
    libraryAuthor('Lispector, Clarice');

    expect(resolveNames(['Clarice Lispector'])['authors'])->toBe([['Clarice Lispector', true]]);
});

test('a surname is only compared with the surname of a known author', function () {
    libraryAuthor('Franz Kafka');

    expect(resolveNames(['Anne Frank'])['authors'])->toBe([['Anne Frank', false]]);
});

test('a surname close to the surname of a known author still matches', function () {
    libraryAuthor('Fiódor Dostoiévski');

    expect(resolveNames(['Dostoievsk'])['authors'])->toBe([['Fiódor Dostoiévski', true]]);
});

test('a request names at most twenty resolved authors', function () {
    foreach (range(1, 21) as $number) {
        libraryAuthor("Ana Tolstoi {$number}");
    }

    expect(resolveNames(['Tolstoi'])['authors'])->toHaveCount(20);
});
