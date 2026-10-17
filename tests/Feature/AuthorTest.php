<?php

use App\Models\Author;
use App\Models\Book;
use App\Services\BookLookup\BrasilApiProvider;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

/** Autor com um livro de ISBN, como o Torto Arado. */
function authorWithBook(string $name = 'Itamar Vieira Junior', string $title = 'Torto Arado', ?string $isbn = '9786580309313'): Author
{
    $book = Book::factory()->withAuthors([$name])->create(['title' => $title, 'isbn_13' => $isbn]);

    return $book->authors->first();
}

function fakeAuthorApi(array $works): void
{
    Http::fake(function (Request $request) use ($works) {
        $url = urldecode($request->url());

        return match (true) {
            str_contains($url, 'isbn=') => Http::response(['docs' => [[
                'author_name' => ['Itamar Vieira Junior', 'Itamar Vieira Júnior'],
                'author_key' => ['OL9081057A', 'OL10795389A'],
            ]]]),
            str_contains($url, 'author_key:') => Http::response(['docs' => $works]),
            str_contains($url, 'brasilapi.com.br/api/isbn/v1/9786580309320') => Http::response(['title' => 'Doramar ou a Odisseia', 'authors' => ['Itamar Vieira Junior'], 'cover_url' => 'https://x.test/c.jpg']),
            str_contains($url, 'brasilapi.com.br') || str_contains($url, 'googleapis') => Http::response([], 404),
            default => Http::response(['docs' => []]),
        };
    });
}

test('a lista de autores mostra quantos livros cada um tem', function () {
    authorWithBook();
    Book::factory()->withAuthors(['Itamar Vieira Junior'])->create();

    $this->get(route('authors.index'))->assertInertia(fn ($page) => $page
        ->where('authors.0.name', 'Itamar Vieira Junior')
        ->where('authors.0.books', 2));
});

test('as obras vêm pelas chaves do autor, sem o que já está na biblioteca', function () {
    $author = authorWithBook();
    fakeAuthorApi([
        ['key' => '/works/OL1W', 'title' => 'Torto Arado', 'author_name' => ['Itamar Vieira Júnior'], 'isbn' => ['9786580309313'], 'first_publish_year' => 2019, 'edition_count' => 4, 'language' => ['por']],
        ['key' => '/works/OL2W', 'title' => 'Doramar ou a Odisseia', 'author_name' => ['Itamar Vieira Junior'], 'isbn' => ['9786580309320'], 'first_publish_year' => 2021, 'edition_count' => 1, 'language' => ['por', 'eng'], 'want_to_read_count' => 5],
        // Tradução listada como obra à parte: sem edição brasileira, não entra.
        ['key' => '/works/OL3W', 'title' => 'Doramar, or the Odyssey', 'author_name' => ['Itamar Vieira Junior'], 'isbn' => ['9781234567897'], 'language' => ['eng'], 'edition_count' => 1],
        // A mesma obra com outro título original e edição brasileira repetida: aparece uma vez.
        ['key' => '/works/OL5W', 'title' => 'Doramar (original)', 'author_name' => ['Itamar Vieira Junior'], 'isbn' => ['9786580309320'], 'language' => ['por']],
        ['key' => '/works/OL4W', 'title' => 'Itamar Vieira Junior', 'author_name' => ['Itamar Vieira Junior']],
    ]);

    $response = $this->getJson(route('authors.works', $author))->assertOk()->json();

    expect($response['verified'])->toBeTrue()
        ->and(array_column($response['items'], 'title'))->toBe(['Doramar ou a Odisseia'])
        ->and($response['items'][0]['portuguese'])->toBeTrue()
        ->and($author->refresh()->open_library_key)->toBe('OL9081057A,OL10795389A');

    Http::assertSent(fn (Request $request) => str_contains(urldecode($request->url()), 'author_key:OL9081057A OR author_key:OL10795389A'));
});

test('autor que não dá para identificar com certeza não mostra obras', function () {
    $author = authorWithBook('John Smith', 'Um livro', null);

    Http::fake([
        'openlibrary.org/search/authors.json*' => Http::response(['docs' => [
            ['key' => 'OL1A', 'name' => 'John Smith', 'work_count' => 40],
            ['key' => 'OL2A', 'name' => 'John Smith', 'work_count' => 35],
        ]]),
        'openlibrary.org/search.json*' => Http::response(['docs' => []]),
    ]);

    $this->getJson(route('authors.works', $author))->assertOk()->assertJson(['verified' => false, 'items' => []]);

});

test('sem ISBN, um nome com um autor claramente mais conhecido é aceito e junta os cadastros duplicados', function () {
    $author = authorWithBook('Machado de Assis', 'Dom Casmurro', null);

    Http::fake(function (Request $request) {
        return str_contains($request->url(), 'search/authors.json')
            ? Http::response(['docs' => [
                ['key' => 'OL93286A', 'name' => 'Machado de Assis', 'work_count' => 435],
                ['key' => 'OL12513201A', 'name' => 'Machado De Assis', 'work_count' => 72],
                ['key' => 'OL13043188A', 'name' => 'Machado De ASSIS', 'work_count' => 4],
                ['key' => 'OL1A', 'name' => 'Outro Machado', 'work_count' => 900],
            ]])
            : Http::response(['docs' => []]);
    });

    $this->getJson(route('authors.works', $author))->assertJson(['verified' => true]);

    expect($author->refresh()->open_library_key)->toBe('OL93286A,OL12513201A,OL13043188A');
});

test('a página do autor reúne os livros de grafias diferentes da mesma pessoa', function () {
    $a = authorWithBook('Itamar Vieira Junior');
    $a->update(['open_library_key' => 'OL9081057A,OL10795389A']);
    $b = authorWithBook('Itamar Vieira Júnior', 'Salvar o Fogo', '9786559211111');
    $b->update(['open_library_key' => 'OL9081057A,OL10795389A']);

    $this->get(route('authors.show', $a))->assertInertia(fn ($page) => $page
        ->component('author')
        ->has('books', 2));
});

test('pelo título, só vale o autor de nome parecido, nunca o "único autor" de outro livro', function () {
    $author = authorWithBook('Lev Tolstói', 'A Morte de Ivan Ilitch', null);

    Http::fake([
        'openlibrary.org/search.json*' => Http::response(['docs' => [
            ['title' => 'A morte de Ivan Ilitch', 'author_name' => ['Jonathan C. Young'], 'author_key' => ['OL4680306A']],
        ]]),
        'openlibrary.org/search/authors.json*' => Http::response(['docs' => []]),
    ]);

    $this->getJson(route('authors.works', $author))->assertJson(['verified' => false]);

    expect($author->refresh()->open_library_key)->toBeNull();
});

test('a BrasilAPI mistura tradutores na lista de autores: fica só o primeiro', function () {
    Http::fake(['brasilapi.com.br/*' => Http::response([
        'title' => 'Manual de Epicteto',
        'authors' => ['Epicteto', 'Marcela Badolatto | Studio Mandragora', 'Edson Bini', 'Karina Tenório'],
    ])]);

    $book = app(BrasilApiProvider::class)->findByIsbn('9786556600338');

    expect($book?->authors)->toBe(['Epicteto']);
});

test('a Open Library listando só o tradutor como autor não vale como identidade', function () {
    $author = authorWithBook('Lev Tolstói', 'A Morte de Ivan Ilitch', '9788573263596');

    Http::fake([
        'openlibrary.org/search.json*' => Http::response(['docs' => [
            ['title' => 'Morte De Ivan Ilitch, A', 'author_name' => ['Jonathan C. Young'], 'author_key' => ['OL4680306A']],
        ]]),
        'openlibrary.org/search/authors.json*' => Http::response(['docs' => []]),
    ]);

    $this->getJson(route('authors.works', $author))->assertJson(['verified' => false]);
});
