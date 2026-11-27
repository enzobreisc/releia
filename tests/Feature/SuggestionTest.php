<?php

use App\Enums\ReadingStatus;
use App\Enums\RecommendationStatus;
use App\Models\Book;
use App\Models\Recommendation;
use App\Models\ShoppingItem;
use App\Services\Recommendation\Source;
use App\Services\Recommendation\SourceBooks;
use App\Services\Recommendation\SourceOrigin;
use App\Services\RecommendationService;
use App\Services\ShoppingService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    Carbon::setTestNow('2026-10-15 09:00:00');
});

function wantToReadBook(string $title, string $author): Book
{
    $book = Book::factory()->withAuthors([$author])->create(['title' => $title, 'genre' => null]);
    $book->readings()->create(['status' => ReadingStatus::WantToRead]);

    return $book;
}

/**
 * Open Library lists `$worksOnPage` works of "Autor {n}" on page {p}. Each work has its own Brazilian
 * ISBN, which names its author, page and position, so its edition can be found again.
 *
 * @param  Closure(int, int): int  $worksOnPage
 * @param  (Closure(int, int, int): bool)|null  $hasEdition  whether the Brazilian edition of work {w} is listed; all are by default
 */
function fakeAuthorWorks(Closure $worksOnPage, ?Closure $hasEdition = null): void
{
    Http::fake(function (Request $request) use ($worksOnPage, $hasEdition) {
        $url = urldecode($request->url());
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);

        if (isset($query['author'])) {
            $author = (int) substr($query['author'], strlen('Autor '));
            $page = (int) ($query['page'] ?? 1);

            $works = $worksOnPage($author, $page);

            return Http::response(['docs' => collect($works > 0 ? range(1, $works) : [])
                ->map(fn (int $work) => [
                    'key' => "/works/OL{$author}{$page}{$work}W",
                    'title' => "Obra {$author}.{$page}.{$work}",
                    'author_name' => ["Autor {$author}"],
                    'isbn' => [workIsbn($author, $page, $work)],
                    'cover_i' => 1,
                ])
                ->values()
                ->all()]);
        }

        if (preg_match('/bibkeys=ISBN:(\d{13})/', $url, $match) === 1) {
            [$author, $page, $work] = [(int) substr($match[1], 5, 3), (int) substr($match[1], 8, 2), (int) substr($match[1], 10, 2)];

            if ($hasEdition !== null && ! $hasEdition($author, $page, $work)) {
                return Http::response([]);
            }

            return Http::response(["ISBN:{$match[1]}" => [
                'title' => "Obra {$author}.{$page}.{$work}",
                'authors' => [['name' => "Autor {$author}"]],
                'cover' => ['large' => 'https://covers.openlibrary.org/b/id/1-L.jpg'],
                'number_of_pages' => 200,
                'subjects' => [['name' => 'Fiction']],
                'description' => 'x',
            ]]);
        }

        return Http::response([], 404);
    });
}

function workIsbn(int $author, int $page, int $work): string
{
    $body = sprintf('97885%03d%02d%02d', $author, $page, $work);
    $sum = 0;

    foreach (str_split($body) as $position => $digit) {
        $sum += (int) $digit * ($position % 2 === 0 ? 1 : 3);
    }

    return $body.((10 - $sum % 10) % 10);
}

/**
 * @return list<string> "author|page" of each Open Library author search of this test, in the order they were sent
 */
function requestedAuthorPairs(): array
{
    return collect(Http::recorded())
        ->map(function (array $pair): ?string {
            parse_str((string) parse_url($pair[0]->url(), PHP_URL_QUERY), $query);

            return isset($query['author']) ? $query['author'].'|'.($query['page'] ?? 1) : null;
        })
        ->filter()
        ->values()
        ->all();
}

/**
 * @return list<int> the page of each Open Library author search of this test, in the order they were sent
 */
function requestedAuthorPages(): array
{
    return array_map(fn (string $pair) => (int) Str::after($pair, '|'), requestedAuthorPairs());
}

function editionRequestsTotal(): int
{
    return Http::recorded(fn (Request $request) => str_contains(urldecode($request->url()), 'bibkeys='))->count();
}

function editionRequestsFor(string $isbn): int
{
    return Http::recorded(fn (Request $request) => str_contains(urldecode($request->url()), "bibkeys=ISBN:{$isbn}"))->count();
}

test('só livros avaliados com 4 ou 5 geram sugestões', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 3, 'Magic realism (Literature)');

    expect(app(RecommendationService::class)->generate())->toBe(0);

    Http::assertNothingSent();
});

test('vale a nota da leitura mais recente, não a da primeira passagem', function () {
    fakeOpenLibrary();

    $book = Book::factory()->withAuthors(['Itamar Vieira Junior'])->create(['genre' => null]);
    $book->readings()->create(['status' => ReadingStatus::Read, 'rating' => 5]);
    $book->readings()->create(['status' => ReadingStatus::Read, 'rating' => 2]);

    expect(app(RecommendationService::class)->generate())->toBe(0);
    Http::assertNothingSent();
});

test('finds other works by the same author, without repeating the library', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)', '9786580309313');
    Book::factory()->withAuthors(['Itamar Vieira Junior'])->create(['title' => 'Salvar o Fogo']);

    app(RecommendationService::class)->generate();

    $titles = Recommendation::pluck('title')->all();

    expect($titles)->toContain('Doramar ou a Odisseia')
        ->and($titles)->not->toContain('Torto Arado')
        ->and($titles)->not->toContain('Salvar o fogo');
});

test('toda sugestão tem motivo e livro de origem', function () {
    fakeOpenLibrary();
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    app(RecommendationService::class)->generate();

    $recommendations = Recommendation::all();

    expect($recommendations)->not->toBeEmpty();

    foreach ($recommendations as $recommendation) {
        expect(trim($recommendation->reason))->not->toBe('')
            ->and($recommendation->based_on_book_id)->toBe($source->id)
            ->and($recommendation->reason)->toBe('mesmo autor que Torto Arado');
    }
});

test('o mesmo candidato apontado por dois livros sobe e cita os dois no motivo', function () {
    Http::fake(function (Request $request) {
        $url = urldecode($request->url());
        $work = ['key' => '/works/OL1W', 'title' => 'Doramar', 'author_name' => ['Itamar Vieira Junior'], 'isbn' => ['9786580309313'], 'cover_i' => 1, 'edition_count' => 2];

        return match (true) {
            str_contains($url, 'author=Itamar') => Http::response(['docs' => [$work]]),
            str_contains($url, 'bibkeys=') => Http::response(['ISBN:9786580309313' => ['title' => 'Doramar', 'authors' => [['name' => 'Itamar Vieira Junior']], 'cover' => ['large' => 'https://x.test/c.jpg'], 'number_of_pages' => 100, 'subjects' => [['name' => 'Fiction']], 'description' => 'x']]),
            default => Http::response([], 404),
        };
    });

    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    ratedBook('Salvar o Fogo', 'Itamar Vieira Junior', 4);

    app(RecommendationService::class)->generate();

    expect(Recommendation::sole()->reason)->toMatch('/^mesmo autor que (Torto Arado e Salvar o Fogo|Salvar o Fogo e Torto Arado)$/');
});

test('uma nova busca acrescenta às pendentes, sem repetir nem apagar', function () {
    fakeOpenLibrary();
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    $existing = Recommendation::factory()->create(['title' => 'Livro já sugerido', 'based_on_book_id' => $source->id]);

    app(RecommendationService::class)->generate();

    expect(Recommendation::find($existing->id))->not->toBeNull()
        ->and(Recommendation::where('title', 'Doramar ou a Odisseia')->count())->toBe(1);
});

test('não repete o que já foi descartado nem o que já está sugerido', function () {
    fakeOpenLibrary();
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    Recommendation::factory()->create([
        'title' => 'Doramar ou a Odisseia',
        'author' => 'Itamar Vieira Junior',
        'status' => RecommendationStatus::Dismissed,
        'based_on_book_id' => $source->id,
    ]);

    $service = app(RecommendationService::class);
    $service->generate();
    $service->generate();

    expect(Recommendation::where('title', 'Doramar ou a Odisseia')->count())->toBe(1)
        ->and(Recommendation::where('title', 'Salvar o fogo')->count())->toBe(1);
});

test('uma obra com várias edições aparece uma vez, e o nome do autor não vira sugestão', function () {
    // Only the works this test names, so the per-author cap never decides which Helena is kept.
    Http::fake(function (Request $request) {
        if (! str_contains(urldecode($request->url()), 'author=Machado')) {
            return null;
        }

        return Http::response(['docs' => collect(apiFixture('open-library/search-author-machado-de-assis.json')['docs'])
            ->whereIn('title', ['Helena', 'Machado de Assis', 'Dom Casmurro'])
            ->values()
            ->all()]);
    });
    fakeOpenLibrary();
    ratedBook('Dom Casmurro', 'Machado de Assis', 4);

    app(RecommendationService::class)->generate();

    expect(Recommendation::where('title', 'Helena')->count())->toBe(1)
        ->and(Recommendation::where('title', 'Machado de Assis')->exists())->toBeFalse()
        ->and(Recommendation::where('title', 'Dom Casmurro')->exists())->toBeFalse();
});

test('Open Library searches are cached: a repeated search sends no new author search', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    $service = app(RecommendationService::class);
    $service->generate();
    $sent = count(Http::recorded());

    $service->generate();

    expect(collect(Http::recorded())->slice($sent)->filter(fn (array $pair) => str_contains($pair[0]->url(), 'author='))->all())->toBe([]);
});

test('"quero ler" cria o livro na estante com os metadados do ISBN', function () {
    Http::fake([
        'openlibrary.org/api/books*' => apiFixture('open-library/books-9788535933390.json'),
        'openlibrary.org/search.json*' => Http::response(['docs' => []]),
        'brasilapi.com.br/*' => Http::response([], 404),
        'www.googleapis.com/*' => Http::response([], 429),
        'covers.openlibrary.org/*' => Http::response(str_repeat('x', 4096), 200, ['Content-Type' => 'image/jpeg']),
    ]);

    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    $recommendation = Recommendation::factory()->create([
        'title' => 'O Avesso da Pele',
        'author' => 'Jeferson Tenório',
        'isbn_13' => '9788535933390',
        'based_on_book_id' => $source->id,
    ]);

    $this->patch(route('suggestions.accept', $recommendation))->assertRedirect();

    $book = Book::with('currentReading')->where('isbn_13', '9788535933390')->sole();

    expect($book->publisher)->toBe('Companhia das Letras')
        ->and($book->currentReading?->status)->toBe(ReadingStatus::WantToRead)
        ->and($recommendation->refresh()->status)->toBe(RecommendationStatus::WantToRead);
});

test('"quero ler" de um livro que já está na biblioteca não duplica o ISBN', function () {
    Http::fake();
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    Book::factory()->create(['isbn_13' => '9788535933390', 'title' => 'O Avesso da Pele']);
    $recommendation = Recommendation::factory()->create([
        'title' => 'O Avesso da Pele',
        'isbn_13' => '9788535933390',
        'based_on_book_id' => $source->id,
    ]);

    $this->patch(route('suggestions.accept', $recommendation))->assertRedirect();

    expect(Book::where('isbn_13', '9788535933390')->count())->toBe(1)
        ->and($recommendation->refresh()->status)->toBe(RecommendationStatus::WantToRead);
    Http::assertNothingSent();
});

test('"já li" cria o livro como lido e encerra a sugestão', function () {
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    $recommendation = Recommendation::factory()->create([
        'title' => 'Doramar ou a Odisseia',
        'author' => 'Itamar Vieira Junior',
        'based_on_book_id' => $source->id,
    ]);

    $this->patch(route('suggestions.already-read', $recommendation))->assertRedirect();

    $book = Book::with('currentReading')->where('title', 'Doramar ou a Odisseia')->sole();

    expect($book->currentReading?->status)->toBe(ReadingStatus::Read)
        ->and($book->authors->pluck('name')->all())->toBe(['Itamar Vieira Junior'])
        ->and($recommendation->refresh()->status)->toBe(RecommendationStatus::Dismissed);
});

test('"sem interesse" descarta e o livro nunca mais é sugerido', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');
    $service = app(RecommendationService::class);
    $service->generate();

    $recommendation = Recommendation::where('title', 'Doramar ou a Odisseia')->sole();
    $this->patch(route('suggestions.dismiss', $recommendation))->assertRedirect();

    expect($recommendation->refresh()->status)->toBe(RecommendationStatus::Dismissed);

    $service->generate();

    expect(Recommendation::where('title', 'Doramar ou a Odisseia')->count())->toBe(1);
});

test('a sugestão do dia é estável durante o dia', function () {
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    Recommendation::factory()->count(3)->create(['based_on_book_id' => $source->id]);

    $service = app(RecommendationService::class);
    $first = $service->today();

    expect($first)->not->toBeNull()
        ->and($service->today()?->id)->toBe($first->id);

    // Even if the day's suggestion is dismissed, the day still gets one.
    $service->dismiss($first);
    $next = $service->today();

    expect($next)->not->toBeNull()
        ->and($next->id)->not->toBe($first->id)
        ->and($service->today()?->id)->toBe($next->id);
});

test('sem sugestões novas, a sugestão do dia é nula', function () {
    expect(app(RecommendationService::class)->today())->toBeNull();
});

test('a tela lista as sugestões com motivo e livro de origem', function () {
    $source = ratedBook('Dom Casmurro', 'Machado de Assis', 5);
    Recommendation::factory()->create([
        'title' => 'Helena',
        'author' => 'Machado de Assis',
        'reason' => 'mesmo autor que Dom Casmurro',
        'based_on_book_id' => $source->id,
    ]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('suggestions')
            ->where('hasSources', true)
            ->has('suggestions', 1)
            ->where('suggestions.0.title', 'Helena')
            ->where('suggestions.0.reason', 'mesmo autor que Dom Casmurro')
            ->where('suggestions.0.based_on', 'Dom Casmurro'));
});

test('a tela sem livros avaliados mostra o estado vazio', function () {
    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('suggestions')
            ->where('hasSources', false)
            ->has('suggestions', 0));
});

test('uma sugestão gerada pelo comando aparece na tela', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    $this->artisan('releia:suggestions')->assertSuccessful();

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page->has('suggestions.0'));
});

test('o comando gera sugestões novas', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    $this->artisan('releia:suggestions')->assertSuccessful();

    expect(Recommendation::count())->toBeGreaterThan(0);
});

test('o comando avisa quando não há livros avaliados com 4 ou 5', function () {
    $this->artisan('releia:suggestions')
        ->expectsOutputToContain('Avalie livros com 4 ou 5 estrelas')
        ->assertSuccessful();
});

test('o início mostra a sugestão do dia com motivo e livro de origem', function () {
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    Recommendation::factory()->create([
        'based_on_book_id' => $source->id,
        'title' => 'Doramar ou a Odisseia',
        'reason' => 'mesmo autor que Torto Arado',
    ]);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('suggestion.title', 'Doramar ou a Odisseia')
            ->where('suggestion.reason', 'mesmo autor que Torto Arado')
            ->where('suggestion.based_on', 'Torto Arado'));
});

test('sem sugestões novas, o início não mostra o card', function () {
    $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('suggestion', null));
});

test('a sugestão guarda a obra e lista as edições com as que já estão na biblioteca marcadas', function () {
    Http::fake([
        'openlibrary.org/works/OL1003040W/editions.json*' => apiFixture('open-library/editions-OL1003040W.json'),
    ]);

    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    $recommendation = Recommendation::factory()->create(['based_on_book_id' => $source->id, 'work_key' => 'OL1003040W']);

    $items = $this->getJson(route('suggestions.editions', $recommendation))->assertOk()->json('items');

    expect($items)->not->toBeEmpty()
        ->and($items[0])->toHaveKeys(['isbn_13', 'publisher', 'library_id']);
});

test('sem a obra guardada não há edições para escolher', function () {
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    $recommendation = Recommendation::factory()->create(['based_on_book_id' => $source->id, 'work_key' => null]);

    $this->getJson(route('suggestions.editions', $recommendation))->assertOk()->assertJson(['items' => []]);
});

test('"quero ler" com uma edição escolhida cria essa edição', function () {
    Http::fake([
        'openlibrary.org/api/books*' => apiFixture('open-library/books-9788535933390.json'),
        'openlibrary.org/search.json*' => Http::response(['docs' => []]),
        'brasilapi.com.br/*' => Http::response([], 404),
        'www.googleapis.com/*' => Http::response([], 429),
        'covers.openlibrary.org/*' => Http::response(str_repeat('x', 4096), 200, ['Content-Type' => 'image/jpeg']),
    ]);

    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    $recommendation = Recommendation::factory()->create([
        'title' => 'O Avesso da Pele',
        'isbn_13' => '9786580309313',
        'based_on_book_id' => $source->id,
    ]);

    $this->patch(route('suggestions.accept', $recommendation), ['isbn_13' => '9788535933390'])->assertRedirect();

    expect(Book::where('isbn_13', '9788535933390')->exists())->toBeTrue()
        ->and(Book::where('isbn_13', '9786580309313')->where('title', 'O Avesso da Pele')->exists())->toBeFalse();
});

test('sugestão antiga, sem a obra guardada, acha a obra pelo ISBN ao listar as edições', function () {
    Http::fake([
        'openlibrary.org/search.json*' => Http::response(['docs' => [['key' => '/works/OL1003040W']]]),
        'openlibrary.org/works/OL1003040W/editions.json*' => apiFixture('open-library/editions-OL1003040W.json'),
        // The suggested edition is looked up too, and no catalog needs to know it here.
        '*' => Http::response([], 404),
    ]);

    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    $recommendation = Recommendation::factory()->create(['based_on_book_id' => $source->id, 'isbn_13' => '9786580309313', 'work_key' => null]);

    $this->getJson(route('suggestions.editions', $recommendation))->assertOk();

    expect($recommendation->refresh()->work_key)->toBe('OL1003040W');
});

test('a want-to-read book is not suggested again under its edition\'s publisher name', function () {
    Http::fake(function (Request $request) {
        $url = urldecode($request->url());

        if (str_contains($url, 'author=Autor X')) {
            return Http::response(['docs' => [[
                'key' => '/works/OL9W',
                'title' => 'Original Title',
                'author_name' => ['Autor X'],
                'isbn' => ['9788535933390'],
                'cover_i' => 1,
            ]]]);
        }

        if (str_contains($url, 'bibkeys=ISBN:9788535933390')) {
            return Http::response(['ISBN:9788535933390' => [
                'title' => 'Obra Teste',
                'authors' => [['name' => 'Editora Qualquer']],
                'cover' => ['large' => 'https://covers.openlibrary.org/b/id/1-L.jpg'],
                'number_of_pages' => 200,
                'subjects' => [['name' => 'Fiction']],
                'description' => 'x',
            ]]);
        }

        return Http::response([], 404);
    });
    wantToReadBook('Obra Teste', 'Autor X');

    app(RecommendationService::class)->generate();

    expect(Recommendation::count())->toBe(0);
});

test('a want-to-read book leads to works by the same author, without a subject search', function () {
    fakeOpenLibrary();
    wantToReadBook('Dom Casmurro', 'Machado de Assis');

    app(RecommendationService::class)->generate();

    $recommendations = Recommendation::all();

    expect($recommendations)->not->toBeEmpty()
        ->and($recommendations->pluck('reason')->unique()->all())->toBe(['mesmo autor que Dom Casmurro, que você quer ler'])
        ->and($recommendations->every(fn (Recommendation $recommendation) => $recommendation->based_on_book_id === null))->toBeTrue()
        ->and(Recommendation::where('title', 'Dom Casmurro')->exists())->toBeFalse();
    Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'subject='));
});

test('an unbought shopping item leads to works by its author, with the shopping list reason', function () {
    fakeOpenLibrary();
    ShoppingItem::factory()->create(['title' => 'Dom Casmurro', 'author' => 'Machado de Assis']);

    app(RecommendationService::class)->generate();

    $recommendations = Recommendation::all();

    expect($recommendations)->not->toBeEmpty()
        ->and($recommendations->pluck('reason')->unique()->all())->toBe(['mesmo autor que Dom Casmurro, da sua lista de compras'])
        ->and($recommendations->every(fn (Recommendation $recommendation) => $recommendation->based_on_book_id === null))->toBeTrue()
        ->and(Recommendation::where('title', 'Dom Casmurro')->exists())->toBeFalse();
});

test('a bought shopping item alone gives no suggestions and no request', function () {
    fakeOpenLibrary();
    ShoppingItem::factory()->create(['author' => 'Machado de Assis', 'bought_at' => now()]);

    expect(app(RecommendationService::class)->generate())->toBe(0);

    Http::assertNothingSent();
});

test('a want-to-read book by an author you rated is not picked as a source', function () {
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    wantToReadBook('Salvar o Fogo', 'Itamar Vieira Junior');

    $sources = app(SourceBooks::class)->pick();

    expect(array_filter($sources, fn (Source $source) => $source->origin === SourceOrigin::WantToRead))->toBe([]);
});

test('only the first author of a rated book is left out of the interest sources', function () {
    $coAuthored = Book::factory()->withAuthors(['Autor Principal', 'Itamar Vieira Junior'])->create(['title' => 'Livro a quatro mãos']);
    $coAuthored->readings()->create(['status' => ReadingStatus::Read, 'rating' => 5]);
    wantToReadBook('Salvar o Fogo', 'Itamar Vieira Junior');

    $sources = app(SourceBooks::class)->pick();

    expect(array_values(array_map(
        fn (Source $source) => $source->author,
        array_filter($sources, fn (Source $source) => $source->origin === SourceOrigin::WantToRead),
    )))->toBe(['Itamar Vieira Junior']);
});

test('a surname-first author is searched in given-names order', function (string $origin) {
    fakeOpenLibrary();

    if ($origin === 'shopping item') {
        ShoppingItem::factory()->create(['title' => 'Dom Casmurro', 'author' => 'Assis, Machado de']);
    } else {
        wantToReadBook('Dom Casmurro', 'Assis, Machado de');
    }

    app(RecommendationService::class)->generate();

    Http::assertSent(fn (Request $request) => str_contains(urldecode($request->url()), 'author=Machado de Assis'));
    expect(Recommendation::count())->toBeGreaterThan(0);
})->with(['shopping item', 'want-to-read book']);

test('a shopping item with two authors searches the first one only', function () {
    fakeOpenLibrary();
    ShoppingItem::factory()->create(['title' => 'Antologia', 'author' => 'Ana Silva, João Souza']);

    app(RecommendationService::class)->generate();

    Http::assertSent(fn (Request $request) => str_contains(urldecode($request->url()), 'author=Ana Silva'));
    Http::assertNotSent(fn (Request $request) => str_contains(urldecode($request->url()), 'author=João'));
});

test('at most eight sources are searched, and a want-to-read author still gets one of them', function () {
    fakeOpenLibrary();
    foreach (range(1, 9) as $number) {
        ratedBook("Livro {$number}", "Autor {$number}", 5);
    }
    wantToReadBook('Dom Casmurro', 'Machado de Assis');

    app(RecommendationService::class)->generate();

    $searchedAuthors = collect(Http::recorded())
        ->map(fn (array $pair) => urldecode($pair[0]->url()))
        ->filter(fn (string $url) => str_contains($url, 'author=') && str_contains($url, 'page=1'))
        ->map(fn (string $url) => Str::before(Str::after($url, 'author='), '&'))
        ->unique()
        ->values();

    expect($searchedAuthors)->toHaveCount(8)
        ->and($searchedAuthors)->toContain('Machado de Assis')
        ->and(max(array_count_values(requestedAuthorPairs())))->toBe(1);
});

test('a search creates twenty suggestions from eight authors with three works each', function () {
    fakeAuthorWorks(fn () => 3);
    foreach (range(1, 8) as $author) {
        ratedBook("Livro {$author}", "Autor {$author}", 5);
    }

    expect(app(RecommendationService::class)->generate())->toBe(20)
        ->and(Recommendation::count())->toBe(20);
});

test('a search reads the next page while the first one leaves it short of twenty', function () {
    fakeAuthorWorks(fn (int $author, int $page) => $page === 1 ? 1 : 2);
    foreach (range(1, 8) as $author) {
        ratedBook("Livro {$author}", "Autor {$author}", 5);
    }

    expect(app(RecommendationService::class)->generate())->toBe(20)
        ->and(requestedAuthorPages())->toContain(2);
});

test('an author keeps at most three works across the pages of one search', function () {
    fakeAuthorWorks(fn (int $author, int $page) => match ($page) {
        1 => 2,
        2 => 3,
        default => 0,
    });
    ratedBook('Livro 1', 'Autor 1', 5);

    expect(app(RecommendationService::class)->generate())->toBe(3)
        ->and(Recommendation::where('author', 'Autor 1')->count())->toBe(3)
        ->and(requestedAuthorPages())->toContain(2);
});

test('a work without a Brazilian edition is looked up once, and later pages do not repeat it', function () {
    fakeAuthorWorks(
        fn (int $author, int $page) => $page === 1 ? 2 : 0,
        fn (int $author, int $page, int $work) => $work === 1,
    );
    ratedBook('Livro 1', 'Autor 1', 5);

    expect(app(RecommendationService::class)->generate())->toBe(1)
        ->and(Recommendation::count())->toBe(1)
        ->and(editionRequestsFor(workIsbn(1, 1, 2)))->toBe(1)
        ->and(requestedAuthorPages())->not->toContain(3);
});

test('the lookup limit holds across the pages of one search', function () {
    fakeAuthorWorks(
        fn (int $author, int $page) => $page <= 2 ? 5 : 0,
        fn () => false,
    );
    foreach (range(1, 5) as $author) {
        ratedBook("Livro {$author}", "Autor {$author}", 5);
    }

    expect(app(RecommendationService::class)->generate())->toBe(0)
        ->and(editionRequestsTotal())->toBe(40)
        ->and(requestedAuthorPages())->not->toContain(3);
});

test('an author keeps at most three works, whatever name the edition gives', function (string $editionAuthor) {
    $isbns = ['9788595084742', '9788535933390', '9788576573135', '9788535914849', '9788535911664'];

    Http::fake(function (Request $request) use ($isbns, $editionAuthor) {
        $url = urldecode($request->url());

        if (str_contains($url, 'author=Machado')) {
            return Http::response(['docs' => collect($isbns)->map(fn (string $isbn, int $position) => [
                'key' => '/works/OL'.($position + 1).'W',
                'title' => "Obra {$position}",
                'author_name' => ['Machado de Assis'],
                'isbn' => [$isbn],
                'cover_i' => 1,
            ])->values()->all()]);
        }

        if (preg_match('/bibkeys=ISBN:(\d{13})/', $url, $match) === 1) {
            return Http::response(["ISBN:{$match[1]}" => [
                'title' => "Edição {$match[1]}",
                'authors' => [['name' => $editionAuthor]],
                'cover' => ['large' => 'https://covers.openlibrary.org/b/id/1-L.jpg'],
                'number_of_pages' => 200,
                'subjects' => [['name' => 'Fiction']],
                'description' => 'x',
            ]]);
        }

        return Http::response([], 404);
    });
    ratedBook('Dom Casmurro', 'Machado de Assis', 5);

    app(RecommendationService::class)->generate();

    expect(Recommendation::count())->toBe(3);
})->with(['Machado de Assis', 'Assis, Machado de']);

test('a want-to-read book alone makes the suggestions available', function () {
    fakeOpenLibrary();
    wantToReadBook('Dom Casmurro', 'Machado de Assis');

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page->where('hasSources', true));

    $this->artisan('releia:suggestions')
        ->doesntExpectOutputToContain('Avalie livros com 4 ou 5 estrelas')
        ->assertSuccessful();
});

test('a suggestion without a based-on book shows no similar-to book on the list and on the home card', function () {
    Recommendation::factory()->create([
        'title' => 'Helena',
        'author' => 'Machado de Assis',
        'reason' => 'mesmo autor que Dom Casmurro, que você quer ler',
        'based_on_book_id' => null,
    ]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page->where('suggestions.0.based_on', null));

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('suggestion.title', 'Helena')
            ->where('suggestion.based_on', null));
});

test('deleting a rated book also deletes the suggestions based on it', function () {
    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    Recommendation::factory()->create(['title' => 'Doramar ou a Odisseia', 'based_on_book_id' => $source->id]);

    $source->delete();

    expect(Recommendation::where('title', 'Doramar ou a Odisseia')->exists())->toBeFalse();
});

test('the based-on book stays a cascading foreign key and becomes nullable', function () {
    $foreignKey = collect(Schema::getForeignKeys('recommendations'))
        ->firstWhere('columns', ['based_on_book_id']);
    $column = collect(Schema::getColumns('recommendations'))->firstWhere('name', 'based_on_book_id');

    expect($foreignKey['foreign_table'])->toBe('books')
        ->and(strtolower($foreignKey['on_delete']))->toBe('cascade')
        ->and($column['nullable'])->toBeTrue();
});

test('moving a want-to-read book to the shopping list keeps the suggestions made from it', function () {
    fakeOpenLibrary();
    $book = wantToReadBook('Dom Casmurro', 'Machado de Assis');
    app(RecommendationService::class)->generate();
    $suggestionIds = Recommendation::query()->pluck('id')->all();

    expect($suggestionIds)->not->toBeEmpty();

    expect(app(ShoppingService::class)->fromWishlist($book))->toBeInstanceOf(ShoppingItem::class)
        ->and(Book::find($book->id))->toBeNull();

    expect(Recommendation::query()->whereIn('id', $suggestionIds)->count())->toBe(count($suggestionIds))
        ->and(app(RecommendationService::class)->hasSources())->toBeTrue();
});

test('a rated book never leads to a search by subject', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Romance');

    app(RecommendationService::class)->generate();

    Http::assertNotSent(fn (Request $request) => array_key_exists('subject', $request->data()));
});
