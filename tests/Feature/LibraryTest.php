<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    Carbon::setTestNow('2026-10-14 22:30:00');
});

/**
 * @return array<string, mixed>
 */
function bookPayload(array $overrides = []): array
{
    return [
        'title' => 'Torto Arado',
        'authors' => 'Itamar Vieira Junior',
        'isbn_13' => '978-65-80309-31-3',
        'publisher' => 'Todavia',
        'pages' => '280',
        'genre' => 'Romance',
        'source' => 'open_library',
        'status' => 'want_to_read',
        ...$overrides,
    ];
}

test('cadastra um livro com autores, leitura e capa', function () {
    Http::fake(['covers.openlibrary.org/*' => Http::response(str_repeat('x', 4096), 200, ['Content-Type' => 'image/jpeg'])]);

    $this->post(route('books.store'), bookPayload([
        'authors' => 'Fulana, Beltrano',
        'cover_url' => 'https://covers.openlibrary.org/b/id/12369648-L.jpg',
    ]))->assertRedirect(route('books.show', 1));

    $book = Book::with('authors', 'currentReading')->sole();

    expect($book->isbn_13)->toBe('9786580309313')
        ->and($book->isbn_10)->toBe('6580309318')
        ->and($book->authors->pluck('name')->all())->toBe(['Fulana', 'Beltrano'])
        ->and($book->currentReading?->status)->toBe(ReadingStatus::WantToRead)
        ->and($book->cover_path)->toBe('covers/1.jpg');

    Storage::disk('local')->assertExists('covers/1.jpg');
    Http::assertSent(fn ($request) => str_contains($request->url(), 'default=false'));
});

test('o cadastro não falha quando a capa não baixa', function () {
    Http::fake(['*' => Http::response('', 404)]);

    $this->post(route('books.store'), bookPayload(['cover_url' => 'https://covers.openlibrary.org/b/id/1-L.jpg']))
        ->assertRedirect();

    expect(Book::sole()->cover_path)->toBeNull();
});

test('livro adicionado como lido ganha datas de início e fim', function () {
    $this->post(route('books.store'), bookPayload(['status' => 'read']))->assertRedirect();

    $reading = Reading::sole();

    expect($reading->started_at?->toDateString())->toBe('2026-10-14')
        ->and($reading->finished_at?->toDateString())->toBe('2026-10-14')
        ->and($reading->current_page)->toBe(280);
});

test('recusa ISBN repetido e ISBN inválido', function () {
    Book::factory()->create(['isbn_13' => '9786580309313']);

    $this->post(route('books.store'), bookPayload())
        ->assertSessionHasErrors(['isbn_13' => 'Esse livro já está na biblioteca.']);

    $this->post(route('books.store'), bookPayload(['isbn_13' => '123']))
        ->assertSessionHasErrors('isbn_13');
});

test('cadastro manual aceita livro sem ISBN', function () {
    $this->post(route('books.store'), ['title' => 'Caderno de receitas da vó', 'status' => 'reading'])
        ->assertRedirect();

    expect(Book::sole()->source->value)->toBe('manual');
});

test('a busca ignora acentos e procura em título, autor e ISBN', function (string $term) {
    Book::factory()->withAuthors(['Euclides da Cunha'])->create(['title' => 'Os Sertões', 'isbn_13' => '9788535933390']);
    Book::factory()->withAuthors(['Outra Pessoa'])->create(['title' => 'Outro livro']);

    $this->get(route('library.index', ['q' => $term]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('books', 1)
            ->where('books.0.title', 'Os Sertões'));
})->with(['sertoes', 'SERTÕES', 'euclides', 'cunha sert', '9788535933390']);

test('estante e contagens usam só a leitura mais recente', function () {
    $reread = Book::factory()->create(['title' => 'Relido']);
    $reread->readings()->create(['status' => ReadingStatus::Read]);
    $reread->readings()->create(['status' => ReadingStatus::Reading]);
    Book::factory()->onShelf(ReadingStatus::Read)->create(['title' => 'Só lido']);

    $this->get(route('library.index', ['shelf' => 'read']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('books', 1)
            ->where('books.0.title', 'Só lido')
            ->where('shelves.0.count', 2)
            ->where('shelves.1', ['value' => 'reading', 'label' => 'Lendo', 'count' => 1])
            ->where('shelves.3', ['value' => 'read', 'label' => 'Lidos', 'count' => 1]));
});

test('filtra por gênero e ordena por nota', function () {
    Book::factory()->create(['title' => 'Sem nota', 'genre' => 'Romance'])->readings()->create(['status' => ReadingStatus::Read]);
    Book::factory()->create(['title' => 'Nota 3', 'genre' => 'Romance'])->readings()->create(['status' => ReadingStatus::Read, 'rating' => 3]);
    Book::factory()->create(['title' => 'Nota 5', 'genre' => 'Romance'])->readings()->create(['status' => ReadingStatus::Read, 'rating' => 5]);
    Book::factory()->create(['title' => 'Outro gênero', 'genre' => 'História']);

    $this->get(route('library.index', ['genre' => 'Romance', 'sort' => 'rating']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('books.0.title', 'Nota 5')
            ->where('books.1.title', 'Nota 3')
            ->where('books.2.title', 'Sem nota')
            ->has('books', 3));
});

test('mudar de estante atualiza as datas da leitura', function () {
    $book = Book::factory()->onShelf(ReadingStatus::WantToRead)->create();

    $this->patch(route('books.reading', $book), ['status' => 'reading'])->assertRedirect();
    expect($book->currentReading()->first()?->started_at?->toDateString())->toBe('2026-10-14');

    Carbon::setTestNow('2026-10-20 08:00:00');
    $this->patch(route('books.reading', $book), ['status' => 'read']);

    $reading = $book->currentReading()->first();
    expect($reading?->started_at?->toDateString())->toBe('2026-10-14')
        ->and($reading?->finished_at?->toDateString())->toBe('2026-10-20');
});

test('salva nota e resenha sem mexer na estante', function () {
    $book = Book::factory()->onShelf(ReadingStatus::Read)->create();

    $this->patch(route('books.reading', $book), ['rating' => 4])->assertRedirect();
    $this->patch(route('books.reading', $book), ['review' => '  Muito bom.  ']);

    $reading = $book->currentReading()->first();
    expect($reading?->rating)->toBe(4)
        ->and($reading?->review)->toBe('Muito bom.')
        ->and($reading?->status)->toBe(ReadingStatus::Read);

    $this->patch(route('books.reading', $book), ['rating' => 9])->assertSessionHasErrors('rating');
});

test('detalhe mostra o livro e a capa é servida do disco local', function () {
    $book = Book::factory()->withAuthors(['Machado de Assis'])->create(['title' => 'Dom Casmurro', 'cover_path' => 'covers/1.jpg']);
    Storage::disk('local')->put('covers/1.jpg', 'imagem');

    $this->get(route('books.show', $book))
        ->assertInertia(fn (Assert $page) => $page
            ->component('book')
            ->where('book.title', 'Dom Casmurro')
            ->where('book.authors', 'Machado de Assis')
            ->where('slug', 'dom-casmurro')
            ->where('book.cover_url', fn (string $url) => str_starts_with($url, '/library/'.$book->id.'/cover')));

    $this->get(route('books.cover', $book))->assertOk();
});

test('remover apaga o livro, as leituras e a capa', function () {
    $book = Book::factory()->onShelf(ReadingStatus::Read)->create(['cover_path' => 'covers/1.jpg']);
    Storage::disk('local')->put('covers/1.jpg', 'imagem');

    $this->delete(route('books.destroy', $book))->assertRedirect(route('library.index'));

    expect(Book::count())->toBe(0)->and(Reading::count())->toBe(0);
    Storage::disk('local')->assertMissing('covers/1.jpg');
});

test('resultados de busca marcam o que já está na biblioteca', function () {
    Http::fake(['openlibrary.org/search.json*' => apiFixture('open-library/search-torto-arado.json')]);
    $book = Book::factory()->create(['isbn_13' => '9786580309313']);

    $this->get(route('books.create', ['q' => 'torto arado']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('add-book')
            ->where('results.0.title', 'Torto Arado')
            ->where('results.0.library_id', $book->id));
});

test('a contagem de livros vai para a barra lateral', function () {
    Book::factory()->count(3)->create();

    $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('counts.books', 3));
});

test('lista as edições de uma obra marcando as que já estão na biblioteca', function () {
    Http::fake([
        'openlibrary.org/search.json*' => apiFixture('open-library/search-dom-casmurro.json'),
        'openlibrary.org/works/OL1003040W/editions.json*' => apiFixture('open-library/editions-OL1003040W.json'),
    ]);
    $book = Book::factory()->create(['isbn_13' => '9788582850350']);

    $this->get(route('books.create', ['q' => 'dom casmurro', 'work' => 'OL1003040W', 'publisher' => 'penguin']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('editions.work_key', 'OL1003040W')
            ->where('editions.items', fn ($items) => collect($items)->contains(
                fn ($item) => $item['isbn_13'] === '9788582850350' && $item['library_id'] === $book->id,
            ) && collect($items)->every(fn ($item) => str_contains(strtolower((string) $item['publisher']), 'penguin'))));
});
