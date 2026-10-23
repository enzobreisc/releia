<?php

use App\Models\Author;
use App\Models\Book;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

const FAKE_PHOTO_BODY = 'jpeg';

function fakePhoto(): string
{
    return str_repeat(FAKE_PHOTO_BODY, 400);
}

function photoAuthor(string $name = 'Robert C. Martin'): Author
{
    return Book::factory()->withAuthors([$name])->create(['isbn_13' => '9788576082675'])->authors->first();
}

/**
 * @param  array<string, mixed>  $record  Open Library author record
 * @param  array<string, mixed>  $summaries  Wikipedia summary per language
 */
function fakePhotoApis(array $record, array $summaries = []): void
{
    Http::fake(function (Request $request) use ($record, $summaries) {
        $url = urldecode($request->url());

        return match (true) {
            str_contains($url, 'isbn=') => Http::response(['docs' => [['author_name' => ['Robert C. Martin'], 'author_key' => ['OL2653686A']]]]),
            str_contains($url, '/authors/OL2653686A.json') => Http::response($record),
            str_contains($url, 'wikidata.org') => Http::response(['entities' => ['Q93010' => ['sitelinks' => [
                'enwiki' => ['site' => 'enwiki', 'title' => 'Robert C. Martin'],
                'ptwiki' => ['site' => 'ptwiki', 'title' => 'Robert Cecil Martin'],
            ]]]]),
            str_contains($url, 'pt.wikipedia.org') => Http::response($summaries['pt'] ?? [], isset($summaries['pt']) ? 200 : 404),
            str_contains($url, 'en.wikipedia.org') => Http::response($summaries['en'] ?? [], isset($summaries['en']) ? 200 : 404),
            str_contains($url, 'covers.openlibrary.org'), str_contains($url, 'thumb.wikimedia.org') => Http::response(fakePhoto(), 200, ['Content-Type' => 'image/jpeg']),
            default => Http::response([], 404),
        };
    });
}

test('a foto vem da Open Library e fica guardada no app', function () {
    Storage::fake('local');
    $author = photoAuthor();
    fakePhotoApis(['photos' => [-1, 10721801], 'remote_ids' => ['wikidata' => 'Q93010']]);

    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk()->assertJsonPath('photo_url', fn (string $url) => str_starts_with($url, "/authors/{$author->id}/photo"));

    $author->refresh();
    expect($author->photo_path)->toBe("author-photos/{$author->id}.jpg");
    Storage::disk('local')->assertExists($author->photo_path);
    Http::assertSent(fn (Request $request) => str_contains($request->url(), 'covers.openlibrary.org/a/id/10721801-M.jpg'));
    Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'wikipedia.org'));
});

test('sem foto na Open Library, usa a imagem da Wikipedia em português ligada pelo Wikidata', function () {
    Storage::fake('local');
    $author = photoAuthor();
    fakePhotoApis(
        ['photos' => null, 'remote_ids' => ['wikidata' => 'Q93010'], 'links' => []],
        [
            'pt' => ['type' => 'standard', 'thumbnail' => ['source' => 'https://thumb.wikimedia.org/pt/330px-Martin.jpg']],
            'en' => ['type' => 'standard', 'thumbnail' => ['source' => 'https://thumb.wikimedia.org/en/330px-Martin.jpg']],
        ],
    );

    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk();

    expect($author->refresh()->photo_path)->not->toBeNull();
    Http::assertSent(fn (Request $request) => str_contains($request->url(), 'pt.wikipedia.org/api/rest_v1/page/summary/Robert_Cecil_Martin'));
    Http::assertSent(fn (Request $request) => str_contains($request->url(), 'thumb.wikimedia.org/pt/'));
    Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'thumb.wikimedia.org/en/'));
});

test('a Wikipedia em inglês é o recurso quando a em português não tem imagem', function () {
    Storage::fake('local');
    $author = photoAuthor();
    fakePhotoApis(
        ['photos' => [], 'remote_ids' => ['wikidata' => 'Q93010']],
        ['pt' => ['type' => 'standard'], 'en' => ['type' => 'standard', 'thumbnail' => ['source' => 'https://thumb.wikimedia.org/en/330px-Martin.jpg']]],
    );

    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk();

    expect($author->refresh()->photo_path)->not->toBeNull();
});

test('o artigo da Wikipedia vem do link do cadastro, nunca de uma busca pelo nome', function () {
    Storage::fake('local');
    $author = photoAuthor();
    fakePhotoApis(
        ['photos' => [], 'links' => [['title' => 'Wikipédia', 'url' => 'https://pt.wikipedia.org/wiki/Robert_Cecil_Martin']]],
        ['pt' => ['type' => 'standard', 'thumbnail' => ['source' => 'https://thumb.wikimedia.org/pt/330px-Martin.jpg']]],
    );

    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk();

    expect($author->refresh()->photo_path)->not->toBeNull();
    Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'wikidata.org'));
    Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'opensearch') || str_contains($request->url(), 'list=search'));
});

test('sem foto em nenhuma fonte, a tentativa fica registrada e não repete a cada visita', function () {
    Storage::fake('local');
    $author = photoAuthor();
    fakePhotoApis(['photos' => []]);

    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk()->assertJson(['photo_url' => null]);

    expect($author->refresh()->photo_looked_up_at)->not->toBeNull()->and($author->photo_path)->toBeNull();

    Http::fake();
    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk();

    Http::assertNothingSent();
});

test('a busca da foto é repetida depois de alguns dias', function () {
    Storage::fake('local');
    $author = photoAuthor();
    $author->update(['photo_looked_up_at' => now()->subDays(8)]);
    fakePhotoApis(['photos' => [10721801]]);

    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk();

    expect($author->refresh()->photo_path)->not->toBeNull();
});

test('autor que não dá para identificar não recebe foto', function () {
    Storage::fake('local');
    $author = Book::factory()->withAuthors(['John Smith'])->create(['isbn_13' => null])->authors->first();
    Http::fake(['*' => Http::response(['docs' => []])]);

    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk()->assertJson(['photo_url' => null]);

    expect($author->refresh()->photo_looked_up_at)->not->toBeNull();
    Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'covers.openlibrary.org'));
});

test('imagem pequena demais é descartada como se não fosse foto', function () {
    Storage::fake('local');
    $author = photoAuthor();
    Http::fake([
        'covers.openlibrary.org/*' => Http::response('x', 200, ['Content-Type' => 'image/jpeg']),
        'openlibrary.org/authors/*' => Http::response(['photos' => [10721801]]),
        '*' => Http::response(['docs' => [['author_name' => ['Robert C. Martin'], 'author_key' => ['OL2653686A']]]]),
    ]);

    $this->getJson(route('authors.lookUpPhoto', $author))->assertOk()->assertJson(['photo_url' => null]);
});

test('a foto guardada é servida pela rota e some quando não existe', function () {
    Storage::fake('local');
    $author = photoAuthor();
    Storage::disk('local')->put('author-photos/1.jpg', fakePhoto());

    $this->get(route('authors.photo', $author))->assertNotFound();

    $author->update(['photo_path' => 'author-photos/1.jpg']);

    $this->get(route('authors.photo', $author))->assertOk()->assertHeader('Cache-Control');
});

test('a página e a lista de autores trazem photo_url, nulo quando não há foto', function () {
    $withPhoto = photoAuthor('Machado de Assis');
    $withPhoto->update(['photo_path' => 'author-photos/x.jpg', 'photo_looked_up_at' => now()]);
    $without = Book::factory()->withAuthors(['Clarice Lispector'])->create()->authors->first();

    $this->get(route('authors.index'))->assertInertia(fn ($page) => $page
        ->where('authors.0.name', 'Clarice Lispector')
        ->where('authors.0.photo_url', null)
        ->where('authors.1.photo_url', fn (string $url) => str_starts_with($url, "/authors/{$withPhoto->id}/photo")));

    $this->get(route('authors.show', $without))->assertInertia(fn ($page) => $page->where('author.photo_url', null));
    $this->get(route('authors.show', $withPhoto))->assertInertia(fn ($page) => $page->where('author.photo_url', fn (string $url) => str_contains($url, '/photo')));
});
