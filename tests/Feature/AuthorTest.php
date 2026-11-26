<?php

use App\Enums\ReadingStatus;
use App\Models\Author;
use App\Models\Book;
use App\Models\Reading;
use App\Services\BookLookup\BrasilApiProvider;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

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

function authorFinishedBook(string $author, string $title, int $pages, ?int $rating, string $finishedAt): Book
{
    $book = Book::factory()->withAuthors([$author])->create(['title' => $title, 'pages' => $pages]);
    Reading::factory()->for($book)->create(['status' => ReadingStatus::Read, 'rating' => $rating, 'finished_at' => $finishedAt]);

    return $book;
}

test('a lista de autores mostra quantos livros cada um tem', function () {
    authorWithBook();
    Book::factory()->withAuthors(['Itamar Vieira Junior'])->create();

    $this->get(route('authors.index'))->assertInertia(fn ($page) => $page
        ->where('authors.0.name', 'Itamar Vieira Junior')
        ->where('authors.0.owned', 2)
        ->has('authors.0.books', 2));
});

test('a lista de autores resume o que foi lido de cada um', function () {
    authorFinishedBook('Machado de Assis', 'Dom Casmurro', 256, 5, '2026-01-10');
    authorFinishedBook('Machado de Assis', 'Quincas Borba', 384, 4, '2026-03-05');
    Book::factory()->withAuthors(['Machado de Assis'])->onShelf(ReadingStatus::WantToRead)->create(['pages' => 500]);
    authorFinishedBook('Clarice Lispector', 'A Hora da Estrela', 88, null, '2026-02-01');

    $this->get(route('authors.index'))->assertInertia(fn ($page) => $page
        ->where('authors_with_read_books', 2)
        ->where('authors.0.name', 'Clarice Lispector')
        ->where('authors.0.average_rating', null)
        ->where('authors.1.name', 'Machado de Assis')
        ->where('authors.1.owned', 3)
        ->where('authors.1.read', 2)
        ->where('authors.1.pages_read', 640)
        ->where('authors.1.average_rating', 4.5)
        ->where('authors.1.last_finished_title', 'Quincas Borba')
        ->where('authors.1.reading_share', 88)
        ->where('authors.1.books.2.is_read', false));
});

test('autor sem livro lido não tem nota, último livro nem páginas lidas', function () {
    Book::factory()->withAuthors(['Franz Kafka'])->onShelf(ReadingStatus::Reading)->create();

    $this->get(route('authors.index'))->assertInertia(fn ($page) => $page
        ->where('authors_with_read_books', 0)
        ->where('authors.0.read', 0)
        ->where('authors.0.pages_read', 0)
        ->where('authors.0.average_rating', null)
        ->where('authors.0.last_finished_title', null)
        ->where('authors.0.reading_share', null));
});

test('só a leitura mais recente de cada livro conta na lista de autores', function () {
    $book = authorFinishedBook('Franz Kafka', 'O Processo', 296, 5, '2026-01-10');
    Reading::factory()->for($book)->create(['status' => ReadingStatus::Reading]);

    $this->get(route('authors.index'))->assertInertia(fn ($page) => $page
        ->where('authors.0.read', 0)
        ->where('authors.0.owned', 1));
});

test('as obras vêm pelas chaves do autor, sem o que já está na biblioteca', function () {
    $author = authorWithBook();
    fakeAuthorApi([
        ['key' => '/works/OL1W', 'title' => 'Torto Arado', 'author_name' => ['Itamar Vieira Júnior'], 'isbn' => ['9786580309313'], 'first_publish_year' => 2019, 'edition_count' => 4, 'language' => ['por']],
        ['key' => '/works/OL2W', 'title' => 'Doramar ou a Odisseia', 'author_name' => ['Itamar Vieira Junior'], 'isbn' => ['9786580309320'], 'first_publish_year' => 2021, 'edition_count' => 1, 'language' => ['por', 'eng'], 'want_to_read_count' => 5],
        // Translation listed as a separate work: without a Brazilian edition it must not appear.
        ['key' => '/works/OL3W', 'title' => 'Doramar, or the Odyssey', 'author_name' => ['Itamar Vieira Junior'], 'isbn' => ['9781234567897'], 'language' => ['eng'], 'edition_count' => 1],
        // Same work with another original title and a repeated Brazilian edition: listed once.
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

test('a segunda visita usa as obras do cache sem quebrar', function () {
    config(['cache.stores.array.serialize' => true]);
    Cache::forgetDriver('array');
    $author = authorWithBook();
    fakeAuthorApi([
        ['key' => '/works/OL2W', 'title' => 'Doramar ou a Odisseia', 'author_name' => ['Itamar Vieira Junior'], 'isbn' => ['9786580309320'], 'first_publish_year' => 2021, 'language' => ['por']],
    ]);

    $first = $this->getJson(route('authors.works', $author))->assertOk()->json();
    $second = $this->getJson(route('authors.works', $author))->assertOk()->json();

    expect($second)->toBe($first)
        ->and(array_column($second['items'], 'title'))->toBe(['Doramar ou a Odisseia']);
});

test('o ISBN listado só num cadastro com grafia errada também traz o cadastro principal pelo título', function () {
    $author = authorWithBook('Machado de Assís', 'Dom Casmurro', '9788508145607');

    Http::fake(function (Request $request) {
        $url = urldecode($request->url());

        return match (true) {
            str_contains($url, 'isbn=') => Http::response(['docs' => [['author_name' => ['Machado de Assís'], 'author_key' => ['OL14308067A']]]]),
            str_contains($url, 'title=') => Http::response(['docs' => [
                ['title' => 'Dom Casmurro', 'author_name' => ['Machado de Assis', 'Machado de Assís'], 'author_key' => ['OL93286A', 'OL14308067A']],
                ['title' => 'Dom Casmurro', 'author_name' => ['Outro Autor'], 'author_key' => ['OL1A']],
            ]]),
            default => Http::response(['docs' => []]),
        };
    });

    $this->getJson(route('authors.works', $author))->assertOk()->assertJson(['verified' => true]);

    expect($author->refresh()->open_library_key)->toBe('OL14308067A,OL93286A');
});

function brazilianWork(string $title, string $isbn): array
{
    return ['key' => '/works/OL1W', 'title' => $title, 'author_name' => ['Itamar Vieira Junior'], 'isbn' => [$isbn], 'language' => ['por']];
}

test('the author page asks Open Library only for works in Portuguese', function () {
    fakeAuthorApi([]);

    $this->getJson(route('authors.works', authorWithBook()))->assertOk();

    Http::assertSent(fn (Request $request) => str_contains($request->data()['q'] ?? '', 'author_key:')
        && ($request->data()['language'] ?? null) === 'por');
});

test('it says you own every work only when the works found are all yours', function () {
    fakeAuthorApi([brazilianWork('Torto Arado', '9786580309313')]);

    $this->getJson(route('authors.works', authorWithBook()))
        ->assertJson(['verified' => true, 'owns_all' => true, 'items' => []]);
});

test('finding no work in Portuguese is not reported as owning them all', function (array $works) {
    fakeAuthorApi($works);

    $this->getJson(route('authors.works', authorWithBook()))
        ->assertJson(['verified' => true, 'owns_all' => false, 'items' => []]);
})->with([
    'no works' => [[]],
    'only a foreign edition' => [[['key' => '/works/OL2W', 'title' => 'Crooked Plow', 'isbn' => ['9781839763410'], 'language' => ['eng']]]],
]);

test('a work titled with just the author surname is not listed', function () {
    fakeAuthorApi([brazilianWork('Junior', '9786580309320')]);
    Cache::put('author-edition:9786580309320', ['title' => 'Junior', 'authors' => [], 'isbn_13' => '9786580309320', 'isbn_10' => null, 'subtitle' => null, 'publisher' => null, 'published_year' => null, 'pages' => null, 'genre' => null, 'description' => null, 'cover_url' => null, 'source' => 'brasil_api']);

    $this->getJson(route('authors.works', authorWithBook()))->assertJson(['items' => []]);
});

test('an edition that lists its author wins over one from your publisher that does not', function () {
    Http::fake([
        'brasilapi.com.br/api/isbn/v1/9788573262735' => Http::response(['title' => 'Os paralamas do sucesso', 'authors' => []]),
        'brasilapi.com.br/api/isbn/v1/9788500000010' => Http::response(['title' => 'O desaparecido', 'authors' => ['Itamar Vieira Junior']]),
    ]);
    // Registered after, so the editions above answer before the catch-all.
    fakeAuthorApi([['key' => '/works/OL1W', 'title' => 'Amerika', 'isbn' => ['9788500000010', '9788573262735'], 'language' => ['por']]]);

    $this->getJson(route('authors.works', authorWithBook(isbn: '9788573263107')))
        ->assertJsonPath('items.0.title', 'O desaparecido');
});
