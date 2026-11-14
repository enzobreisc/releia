<?php

use App\Models\Book;
use App\Services\ShelfOrder;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * @param  array<string, mixed>  $attributes
 */
function shelvedBook(string $title, ?string $author = null, array $attributes = []): Book
{
    $factory = Book::factory();

    if ($author !== null) {
        $factory = $factory->withAuthors([$author]);
    }

    return $factory->create(['title' => $title, ...$attributes]);
}

/**
 * @return list<string>
 */
function shelfTitles(): array
{
    $titles = Book::query()->pluck('title', 'id');

    return array_map(fn (int $id) => $titles[$id], app(ShelfOrder::class)->ids());
}

test('orders by author surname, then series volume, then title, ignoring accents', function () {
    shelvedBook('Zebra', 'Ana Ávila');
    shelvedBook('Duna Messias', 'Frank Herbert', ['series' => 'Duna', 'series_position' => 2]);
    shelvedBook('Duna', 'Frank Herbert', ['series' => 'Duna', 'series_position' => 1]);
    shelvedBook('Arrakis', 'Frank Herbert');
    shelvedBook('Sem autor');
    shelvedBook('Memórias', 'Júlio Ribeiro Júnior');

    expect(shelfTitles())->toBe(['Zebra', 'Arrakis', 'Duna', 'Duna Messias', 'Memórias', 'Sem autor']);
});

test('authors who share a surname are not interleaved', function () {
    shelvedBook('Quincas Borba', 'Machado de Assis');
    shelvedBook('Ensaios', 'Carlos Assis');
    shelvedBook('Dom Casmurro', 'Machado de Assis');

    expect(shelfTitles())->toBe(['Ensaios', 'Dom Casmurro', 'Quincas Borba']);
});

test('a dropped book lands exactly where it was dropped', function () {
    $a = shelvedBook('A', 'Ana Alves');
    shelvedBook('B', 'Beto Barros');
    shelvedBook('C', 'Caio Costa');
    $d = shelvedBook('D', 'Dani Dias');

    $this->patch(route('books.move', $a), ['before_book_id' => $d->id])->assertRedirect();

    expect(shelfTitles())->toBe(['B', 'C', 'A', 'D']);
});

test('a book dropped without a target goes to the end', function () {
    $a = shelvedBook('A', 'Ana Alves');
    shelvedBook('B', 'Beto Barros');
    shelvedBook('C', 'Caio Costa');

    $this->patch(route('books.move', $a), ['before_book_id' => null])->assertRedirect();

    expect(shelfTitles())->toBe(['B', 'C', 'A']);
});

test('a book added after a move sorts next to its neighbours and leaves the others alone', function () {
    $a = shelvedBook('A', 'Ana Alves');
    shelvedBook('C', 'Caio Costa');
    $d = shelvedBook('D', 'Dani Dias');

    $this->patch(route('books.move', $a), ['before_book_id' => $d->id]);
    expect(shelfTitles())->toBe(['C', 'A', 'D']);

    shelvedBook('B', 'Beto Barros');

    expect(shelfTitles())->toBe(['B', 'C', 'A', 'D']);
});

test('moving a book keeps the hand-made order of the others', function () {
    $a = shelvedBook('A', 'Ana Alves');
    $b = shelvedBook('B', 'Beto Barros');
    shelvedBook('C', 'Caio Costa');
    $d = shelvedBook('D', 'Dani Dias');
    $e = shelvedBook('E', 'Edu Egito');

    $this->patch(route('books.move', $e), ['before_book_id' => $a->id]);
    $this->patch(route('books.move', $d), ['before_book_id' => $b->id]);

    expect(shelfTitles())->toBe(['E', 'A', 'D', 'B', 'C']);
});

test('dropping before a visible book in a filtered library lands in the full order', function () {
    $mystery = shelvedBook('M1', 'Ana Alves', ['genre' => 'Mistério']);
    shelvedBook('R1', 'Beto Barros', ['genre' => 'Romance']);
    $mysteryTarget = shelvedBook('M2', 'Caio Costa', ['genre' => 'Mistério']);

    $this->patch(route('books.move', $mystery), ['before_book_id' => $mysteryTarget->id]);

    expect(shelfTitles())->toBe(['R1', 'M1', 'M2']);

    $this->get(route('library.index', ['genre' => 'Mistério']))->assertInertia(fn (Assert $page) => $page
        ->where('books', fn ($books) => collect($books)->sortBy('shelf_rank')->pluck('title')->all() === ['M1', 'M2']));
});

test('moving a book leaves updated_at alone, since it versions the cover url', function () {
    $this->travelTo('2026-01-01 10:00:00');
    $a = shelvedBook('A', 'Ana Alves');
    $b = shelvedBook('B', 'Beto Barros');
    $this->travelTo('2026-02-01 10:00:00');

    $this->patch(route('books.move', $a), ['before_book_id' => null]);

    expect($a->refresh()->updated_at?->toDateString())->toBe('2026-01-01')
        ->and($b->refresh()->updated_at?->toDateString())->toBe('2026-01-01');
});

test('dropping a book on itself changes nothing', function () {
    $a = shelvedBook('A', 'Ana Alves');
    shelvedBook('B', 'Beto Barros');

    $this->patch(route('books.move', $a), ['before_book_id' => $a->id])->assertRedirect();

    expect($a->refresh()->shelf_position)->toBeNull();
});

test('the library sends each book its rank, surname and publisher', function () {
    shelvedBook('B', 'Beto Barros', ['publisher' => 'Editora 34']);
    shelvedBook('A', 'Ana Alves Júnior', ['publisher' => 'EDIPRO']);

    $this->get(route('library.index'))->assertInertia(fn (Assert $page) => $page
        ->where('books', fn ($books) => collect($books)->firstWhere('title', 'A')['shelf_rank'] === 0
            && collect($books)->firstWhere('title', 'A')['author_surname'] === 'Alves'
            && collect($books)->firstWhere('title', 'A')['publisher_key'] === 'edipro'
            && collect($books)->firstWhere('title', 'B')['publisher_key'] === 'editora 34'));
});
