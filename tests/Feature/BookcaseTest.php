<?php

use App\Models\Book;
use App\Models\Bookshelf;
use App\Services\Bookcase;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * @param  array<string, mixed>  $attributes
 */
function bookcaseBook(string $title, string $author, array $attributes = []): Book
{
    return Book::factory()->withAuthors([$author])->create(['title' => $title, ...$attributes]);
}

/**
 * @return array<string, list<string>> shelf name => titles on it
 */
function shelfContents(): array
{
    $books = Book::query()->with('authors')->get();
    $shelfIds = app(Bookcase::class)->shelfIds($books);
    $contents = [];

    foreach (app(Bookcase::class)->shelves() as $shelf) {
        $contents[$shelf->name] = $books
            ->filter(fn (Book $book) => $shelfIds[$book->id] === $shelf->id)
            ->pluck('title')->sort()->values()->all();
    }

    return $contents;
}

/**
 * @param  list<string>  $groupKeys
 */
function organizeBy(string $grouping, array $groupKeys): void
{
    test()->post(route('bookcase.organize'), [
        'grouping' => $grouping,
        'shelves' => array_map(fn (string $key) => ['name' => ucfirst($key), 'group_keys' => [$key]], $groupKeys),
        'catch_all_name' => 'Outros',
    ])->assertRedirect(route('library.index'));
}

test('the setup page offers every grouping with its groups, largest first', function () {
    bookcaseBook('A', 'Ana Alves', ['publisher' => 'Editora Rocco', 'genre' => 'Romance', 'series' => null]);
    bookcaseBook('B', 'Beto Barros', ['publisher' => 'ROCCO', 'genre' => 'Romance', 'series' => 'Duna']);
    bookcaseBook('C', 'Caio Costa', ['publisher' => 'Aleph', 'genre' => 'Ficção', 'series' => null]);

    $this->get(route('bookcase.setup'))->assertInertia(fn (Assert $page) => $page
        ->component('bookcase-setup')
        ->where('has_shelves', false)
        ->where('groupings.0.value', 'publisher')
        ->where('groupings.0.groups', [
            ['key' => 'rocco', 'label' => 'Editora Rocco', 'count' => 2],
            ['key' => 'aleph', 'label' => 'Aleph', 'count' => 1],
        ])
        ->where('groupings.3.groups', [['key' => 'duna', 'label' => 'Duna', 'count' => 1]])
        ->where('books.0.group_keys', ['publisher' => 'rocco', 'author' => 'ana alves', 'genre' => 'romance', 'series' => null]));
});

test('organizing builds one shelf per chosen group and a catch-all for the rest', function () {
    bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    bookcaseBook('B', 'Beto Barros', ['publisher' => 'Editora Rocco']);
    bookcaseBook('C', 'Caio Costa', ['publisher' => 'Aleph']);
    bookcaseBook('D', 'Dani Dias', ['publisher' => 'Vozes']);

    organizeBy('publisher', ['aleph', 'rocco', 'unknown']);

    expect(shelfContents())->toBe(['Aleph' => ['C'], 'Rocco' => ['A', 'B'], 'Outros' => ['D']]);
});

test('a book added later joins the shelf of its group', function () {
    bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    organizeBy('publisher', ['rocco']);

    bookcaseBook('B', 'Beto Barros', ['publisher' => 'ROCCO']);
    bookcaseBook('C', 'Caio Costa', ['publisher' => 'Aleph']);

    expect(shelfContents())->toBe(['Rocco' => ['A', 'B'], 'Outros' => ['C']]);
});

test('organizing again discards the previous shelves and hand-made order', function () {
    $a = bookcaseBook('A', 'Ana Alves', ['genre' => 'Romance']);
    bookcaseBook('B', 'Beto Barros', ['genre' => 'Ficção']);
    organizeBy('genre', ['romance']);
    $this->patch(route('books.move', $a), ['before_book_id' => null, 'bookshelf_id' => Bookshelf::query()->where('is_catch_all', true)->value('id')]);

    organizeBy('author', ['beto barros']);

    expect(shelfContents())->toBe(['Beto barros' => ['B'], 'Outros' => ['A']])
        ->and(Book::query()->whereNotNull('shelf_position')->count())->toBe(0);
});

test('a book dropped on another shelf stays there', function () {
    $a = bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    bookcaseBook('B', 'Beto Barros', ['publisher' => 'Aleph']);
    organizeBy('publisher', ['aleph', 'rocco']);
    $aleph = Bookshelf::query()->where('name', 'Aleph')->firstOrFail();

    $this->patch(route('books.move', $a), ['before_book_id' => null, 'bookshelf_id' => $aleph->id])->assertRedirect();

    expect(shelfContents())->toBe(['Aleph' => ['A', 'B'], 'Rocco' => [], 'Outros' => []]);
});

test('moving a book within its shelf keeps it following its group', function () {
    $a = bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    organizeBy('publisher', ['rocco']);

    $this->patch(route('books.move', $a), ['before_book_id' => null]);

    expect($a->refresh()->bookshelf_id)->toBeNull();
});

test('a shelf can be added, renamed and removed by hand', function () {
    $a = bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    organizeBy('publisher', ['rocco']);

    $this->post(route('bookshelves.store'), ['name' => '  Favoritos '])->assertRedirect();
    $favorites = Bookshelf::query()->where('name', 'Favoritos')->firstOrFail();
    $this->patch(route('books.move', $a), ['before_book_id' => null, 'bookshelf_id' => $favorites->id]);
    $this->patch(route('bookshelves.update', $favorites), ['name' => 'Preferidos'])->assertRedirect();

    expect(shelfContents())->toBe(['Rocco' => [], 'Outros' => [], 'Preferidos' => ['A']]);

    $this->delete(route('bookshelves.destroy', $favorites))->assertRedirect();

    expect(shelfContents())->toBe(['Rocco' => ['A'], 'Outros' => []]);
});

test('the catch-all shelf cannot be removed', function () {
    organizeBy('publisher', []);

    $this->delete(route('bookshelves.destroy', Bookshelf::query()->firstOrFail()))->assertStatus(422);

    expect(Bookshelf::query()->count())->toBe(1);
});

test('rearranging the bookcase leaves updated_at alone, since it versions the cover url', function () {
    $this->travelTo('2026-01-01 10:00:00');
    $a = bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    $this->travelTo('2026-02-01 10:00:00');

    organizeBy('publisher', ['rocco']);
    $this->patch(route('books.move', $a), ['before_book_id' => null, 'bookshelf_id' => Bookshelf::query()->where('is_catch_all', true)->value('id')]);

    expect($a->refresh()->updated_at?->toDateString())->toBe('2026-01-01');
});

test('a shelf needs a name', function () {
    $this->post(route('bookshelves.store'), ['name' => ''])->assertSessionHasErrors('name');
});

test('the library sends the shelves and each book its shelf', function () {
    bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    organizeBy('publisher', ['rocco']);
    $rocco = Bookshelf::query()->where('name', 'Rocco')->firstOrFail();

    $this->get(route('library.index'))->assertInertia(fn (Assert $page) => $page
        ->where('bookcase.0', ['id' => $rocco->id, 'name' => 'Rocco', 'is_catch_all' => false])
        ->where('bookcase.1.is_catch_all', true)
        ->where('books.0.bookshelf_id', $rocco->id));
});

test('the setup can put several groups on one shelf', function () {
    bookcaseBook('A', 'Ana Alves', ['publisher' => 'Penguin']);
    bookcaseBook('B', 'Beto Barros', ['publisher' => 'Companhia das Letras']);
    bookcaseBook('C', 'Caio Costa', ['publisher' => 'Aleph']);

    $this->post(route('bookcase.organize'), [
        'grouping' => 'publisher',
        'shelves' => [['name' => 'Penguin + Companhia', 'group_keys' => ['penguin-companhia', 'companhia das letras']]],
        'catch_all_name' => 'Outros',
    ])->assertRedirect();

    expect(shelfContents())->toBe(['Penguin + Companhia' => ['A', 'B'], 'Outros' => ['C']]);
});

test('merging a shelf into another moves its groups and hand-placed books', function () {
    bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    bookcaseBook('B', 'Beto Barros', ['publisher' => 'Aleph']);
    $c = bookcaseBook('C', 'Caio Costa', ['publisher' => 'Vozes']);
    organizeBy('publisher', ['aleph', 'rocco']);
    $aleph = Bookshelf::query()->where('name', 'Aleph')->firstOrFail();
    $rocco = Bookshelf::query()->where('name', 'Rocco')->firstOrFail();
    $this->patch(route('books.move', $c), ['before_book_id' => null, 'bookshelf_id' => $aleph->id]);

    $this->post(route('bookshelves.merge', $rocco), ['absorbed_id' => $aleph->id])->assertRedirect();
    bookcaseBook('D', 'Dani Dias', ['publisher' => 'Aleph']);

    expect(shelfContents())->toBe(['Rocco' => ['A', 'B', 'C', 'D'], 'Outros' => []]);
});

test('the catch-all shelf cannot be merged, nor a shelf with itself', function () {
    bookcaseBook('A', 'Ana Alves', ['publisher' => 'Rocco']);
    organizeBy('publisher', ['rocco']);
    $rocco = Bookshelf::query()->where('name', 'Rocco')->firstOrFail();
    $catchAll = Bookshelf::query()->where('is_catch_all', true)->firstOrFail();

    $this->post(route('bookshelves.merge', $rocco), ['absorbed_id' => $catchAll->id])->assertStatus(422);
    $this->post(route('bookshelves.merge', $rocco), ['absorbed_id' => $rocco->id])->assertSessionHasErrors('absorbed_id');

    expect(Bookshelf::query()->count())->toBe(2);
});

test('a book stands on the shelf until it is laid down', function () {
    $book = bookcaseBook('A', 'Ana Alves');

    expect($book->fresh()->is_lying_down)->toBeFalse();

    $this->patch(route('books.posture', $book), ['is_lying_down' => true])->assertRedirect();
    expect($book->fresh()->is_lying_down)->toBeTrue();

    $this->patch(route('books.posture', $book), ['is_lying_down' => false])->assertRedirect();
    expect($book->fresh()->is_lying_down)->toBeFalse();
});

test('laying a book down keeps its cover version', function () {
    $book = bookcaseBook('A', 'Ana Alves');
    $updatedAt = $book->fresh()->updated_at;

    $this->travel(1)->minutes();
    $this->patch(route('books.posture', $book), ['is_lying_down' => true]);

    expect($book->fresh()->updated_at->equalTo($updatedAt))->toBeTrue();
});

test('the library tells the shelf which books are lying down', function () {
    $book = bookcaseBook('A', 'Ana Alves', ['is_lying_down' => true]);

    $this->get(route('library.index', ['view' => 'bookcase']))->assertInertia(fn (Assert $page) => $page
        ->where('books.0.id', $book->id)
        ->where('books.0.is_lying_down', true));
});
