<?php

use App\Enums\BookSource;
use App\Services\BookLookupService;
use App\Support\Isbn;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Volume do Google Books no formato documentado em
 * developers.google.com/books/docs/v1/using. A API sem chave respondia 429
 * quando os fixtures foram gravados, por isso este é montado à mão.
 *
 * @return array<string, mixed>
 */
function googleVolume(array $info): array
{
    return ['totalItems' => 1, 'items' => [['volumeInfo' => $info]]];
}

test('busca por ISBN brasileiro completa páginas pela obra e sobrevive ao 429 do Google', function () {
    Http::fake([
        'openlibrary.org/api/books*' => apiFixture('open-library/books-9786580309313.json'),
        'openlibrary.org/search.json*' => apiFixture('open-library/search-isbn-9786580309313.json'),
        'brasilapi.com.br/*' => Http::response([], 404),
        'covers.openlibrary.org/*' => Http::response('', 404),
        'm.media-amazon.com/*' => Http::response('', 404),
        'www.googleapis.com/*' => Http::response(apiFixture('google-books/quota-exceeded.json'), 429),
    ]);

    $book = app(BookLookupService::class)->search('978-65-80309-31-3')[0];

    expect($book->title)->toBe('Torto Arado')
        ->and($book->authors)->toBe(['Itamar Vieira Junior'])
        ->and($book->publisher)->toBe('Todavia')
        ->and($book->pages)->toBe(280)
        ->and($book->isbn10)->toBe('6580309318')
        ->and($book->coverUrl)->toStartWith('https://covers.openlibrary.org/')
        ->and($book->source)->toBe(BookSource::OpenLibrary);
});

test('extrai o ano de datas em texto livre', function () {
    Http::fake([
        'openlibrary.org/api/books*' => apiFixture('open-library/books-9788535933390.json'),
        'openlibrary.org/search.json*' => Http::response(['docs' => []]),
        'brasilapi.com.br/*' => Http::response([], 404),
        'covers.openlibrary.org/*' => Http::response('', 404),
        'm.media-amazon.com/*' => Http::response('', 404),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    $book = app(BookLookupService::class)->findByIsbn('9788535933390');

    expect($book?->title)->toBe('O Avesso da Pele')
        ->and($book?->publishedYear)->toBe(2020)
        ->and($book?->publisher)->toBe('Companhia das Letras');
});

test('completa com o Google Books o que a Open Library não tem', function () {
    Http::fake([
        'openlibrary.org/api/books*' => apiFixture('open-library/books-9780136083221.json'),
        'openlibrary.org/search.json*' => Http::response(['docs' => []]),
        'www.googleapis.com/*' => googleVolume([
            'title' => 'Clean Code',
            'authors' => ['Robert C. Martin'],
            'pageCount' => 464,
            'description' => 'Even bad code can function.',
            'imageLinks' => ['thumbnail' => 'http://books.google.com/books/content?id=x&zoom=1&edge=curl'],
        ]),
    ]);

    $book = app(BookLookupService::class)->findByIsbn('9780136083221');

    expect($book?->subtitle)->toBe('A Handbook of Agile Software Craftsmanship')
        ->and($book?->pages)->toBe(464)
        ->and($book?->description)->toBe('Even bad code can function.')
        ->and($book?->coverUrl)->toBe('https://books.google.com/books/content?id=x&zoom=1')
        ->and($book?->source)->toBe(BookSource::OpenLibrary);
});

test('usa o Google Books quando a Open Library não conhece o ISBN', function () {
    Http::fake([
        'openlibrary.org/api/books*' => Http::response([]),
        'brasilapi.com.br/*' => Http::response([], 404),
        'covers.openlibrary.org/*' => Http::response('', 404),
        'm.media-amazon.com/*' => Http::response('', 404),
        'www.googleapis.com/*' => googleVolume([
            'title' => 'Livro Só no Google',
            'industryIdentifiers' => [['type' => 'ISBN_13', 'identifier' => '9788535933390']],
            'pageCount' => 0,
        ]),
    ]);

    $book = app(BookLookupService::class)->findByIsbn('9788535933390');

    expect($book?->title)->toBe('Livro Só no Google')
        ->and($book?->pages)->toBeNull()
        ->and($book?->source)->toBe(BookSource::GoogleBooks);
});

test('na busca por título prefere o ISBN da edição brasileira', function () {
    Http::fake([
        'openlibrary.org/search.json*' => apiFixture('open-library/search-torto-arado.json'),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    $results = app(BookLookupService::class)->search('torto arado');

    expect($results[0]->title)->toBe('Torto Arado')
        ->and($results[0]->isbn13)->toBe('9786580309313')
        ->and($results[0]->coverUrl)->toBe('https://covers.openlibrary.org/b/id/12369648-L.jpg');
});

test('guarda resultados em cache, mas não falhas', function () {
    Http::fake([
        'openlibrary.org/search.json*' => Http::sequence()
            ->push([], 503)
            ->push(apiFixture('open-library/search-torto-arado.json')),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    $lookup = app(BookLookupService::class);

    expect($lookup->search('torto arado'))->toBe([])
        ->and($lookup->search('torto arado'))->not->toBe([])
        ->and($lookup->search('torto arado'))->not->toBe([]);

    Http::assertSentCount(4);
    Http::assertSent(fn (Request $request) => $request->hasHeader('User-Agent')
        && str_contains($request->header('User-Agent')[0], 'releia'));
});

test('a busca por título traz a obra e o número de edições', function () {
    Http::fake([
        'openlibrary.org/search.json*' => apiFixture('open-library/search-dom-casmurro.json'),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    $work = app(BookLookupService::class)->search('dom casmurro')[0];

    expect($work->workKey)->toBe('OL1003040W')
        ->and($work->editionCount)->toBe(90);
});

test('a busca repassa a editora para a Open Library', function () {
    Http::fake([
        'openlibrary.org/search.json*' => apiFixture('open-library/search-dom-casmurro.json'),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    app(BookLookupService::class)->search('dom casmurro', 'Antofágica');

    Http::assertSent(fn (Request $request) => $request['publisher'] === 'antofagica');
});

test('edições vêm sem repetidas, só com ISBN, brasileiras e com capa primeiro', function () {
    Http::fake(['openlibrary.org/works/OL1003040W/editions.json*' => apiFixture('open-library/editions-OL1003040W.json')]);

    $editions = app(BookLookupService::class)->editions('OL1003040W', ['Machado de Assis']);
    $isbns = array_map(fn ($edition) => $edition->isbn13, $editions);

    expect($isbns)->toBe(array_values(array_unique($isbns)))
        ->and($isbns)->not->toContain(null)
        ->and($editions[0]->isbn13)->toStartWith('978')
        ->and(Isbn::isBrazilian((string) $editions[0]->isbn13))->toBeTrue()
        ->and($editions[0]->coverUrl)->not->toBeNull()
        ->and($editions[0]->authors)->toBe(['Machado de Assis'])
        ->and($isbns)->toContain('9788582850350', '9786586490084', '9788594318602');

    // Entre as brasileiras com capa, as mais recentes vêm antes.
    $brazilianWithCover = array_values(array_filter(
        $editions,
        fn ($edition) => Isbn::isBrazilian((string) $edition->isbn13) && $edition->coverUrl !== null,
    ));
    $years = array_map(fn ($edition) => $edition->publishedYear ?? 0, $brazilianWithCover);
    $sorted = $years;
    rsort($sorted);

    expect($years)->toBe($sorted);
});

test('filtra as edições pela editora sem ligar para acento ou caixa', function (string $publisher, string $expected) {
    Http::fake(['openlibrary.org/works/OL1003040W/editions.json*' => apiFixture('open-library/editions-OL1003040W.json')]);

    $editions = app(BookLookupService::class)->editions('OL1003040W', publisher: $publisher);

    expect($editions)->not->toBeEmpty();

    foreach ($editions as $edition) {
        expect(Str::ascii(mb_strtolower((string) $edition->publisher)))->toContain($expected);
    }
})->with([
    ['PENGUIN', 'penguin'],
    ['antofagica', 'antofagica'],
]);

test('acha pela BrasilAPI um ISBN brasileiro que as outras fontes não conhecem', function () {
    Http::fake([
        'openlibrary.org/api/books*' => Http::response([]),
        'covers.openlibrary.org/*' => Http::response('', 404),
        'm.media-amazon.com/*' => Http::response('', 404),
        'brasilapi.com.br/api/isbn/v1/9786586460018' => Http::response([
            'isbn' => '9786586460018',
            'title' => 'A Luta pela Floresta',
            'authors' => ['Torkjell Leira', 'Torkjell Leira'],
            'publisher' => 'Editora Rua do Sabão',
            'year' => 2020,
            'page_count' => null,
            'subjects' => ['Meio ambiente'],
        ]),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    $book = app(BookLookupService::class)->search('978-65-86460-01-8')[0];

    expect($book->title)->toBe('A Luta pela Floresta')
        ->and($book->authors)->toBe(['Torkjell Leira'])
        ->and($book->publisher)->toBe('Editora Rua do Sabão')
        ->and($book->publishedYear)->toBe(2020)
        ->and($book->source)->toBe(BookSource::BrasilApi);
});

test('não consulta a BrasilAPI para ISBN estrangeiro', function () {
    Http::fake([
        'openlibrary.org/api/books*' => Http::response([]),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    expect(app(BookLookupService::class)->findByIsbn('9780136083221'))->toBeNull();

    Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'brasilapi'));
});

test('sem resultado com a editora, busca só pelo título', function () {
    Http::fake([
        'openlibrary.org/search.json*' => Http::sequence()
            ->push(['docs' => []])
            ->push(apiFixture('open-library/search-torto-arado.json')),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    $results = app(BookLookupService::class)->search('torto arado', 'Editora Inexistente');

    expect($results[0]->title)->toBe('Torto Arado');
});

test('complementa poucos resultados da Open Library com o Google Books, sem repetir', function () {
    Http::fake([
        'openlibrary.org/search.json*' => Http::response(['docs' => [['key' => '/works/OL1W', 'title' => 'Torto Arado', 'author_name' => ['Itamar Vieira Junior']]]]),
        'www.googleapis.com/*' => ['totalItems' => 2, 'items' => [
            ['volumeInfo' => ['title' => 'Torto Arado', 'authors' => ['Itamar Vieira Junior']]],
            ['volumeInfo' => ['title' => 'Livro Obscuro', 'authors' => ['Fulana'], 'publisher' => 'Editora Pequena']],
        ]],
    ]);

    $titles = array_map(fn ($book) => $book->title, app(BookLookupService::class)->search('torto arado', 'Editora Pequena'));

    expect($titles)->toContain('Livro Obscuro')
        ->and(array_count_values($titles)['Torto Arado'])->toBe(1);

    Http::assertSent(fn (Request $request) => str_contains($request->url(), 'googleapis')
        && str_contains(urldecode($request->url()), 'inpublisher:"editora pequena"'));
});

test('quando a fonte não traz capa, acha uma pelo ISBN', function () {
    Http::fake([
        'openlibrary.org/api/books*' => Http::response([]),
        'brasilapi.com.br/*' => Http::response(['title' => 'A Luta pela Floresta', 'cover_url' => null]),
        'covers.openlibrary.org/*' => Http::response('', 404),
        'm.media-amazon.com/images/P/6586460018.01.*' => Http::response(str_repeat('x', 4096), 200, ['Content-Type' => 'image/jpeg']),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    $book = app(BookLookupService::class)->findByIsbn('9786586460018');

    expect($book?->coverUrl)->toStartWith('https://m.media-amazon.com/images/P/6586460018');
});

test('ignora o GIF de 1 pixel que a Amazon devolve quando não tem capa', function () {
    Http::fake([
        'openlibrary.org/api/books*' => Http::response([]),
        'brasilapi.com.br/*' => Http::response(['title' => 'Sem Capa']),
        'covers.openlibrary.org/*' => Http::response('', 404),
        'm.media-amazon.com/*' => Http::response(str_repeat('x', 43), 200, ['Content-Type' => 'image/gif']),
        'www.googleapis.com/*' => Http::response([], 429),
    ]);

    expect(app(BookLookupService::class)->findByIsbn('9786586460018')?->coverUrl)->toBeNull();
});
