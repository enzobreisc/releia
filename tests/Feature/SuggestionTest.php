<?php

use App\Enums\ReadingStatus;
use App\Enums\RecommendationStatus;
use App\Models\Book;
use App\Models\Recommendation;
use App\Services\RecommendationService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    Carbon::setTestNow('2026-10-15 09:00:00');
});

/** Respostas reais da Open Library (tests/Fixtures), escolhidas pela consulta. */
function fakeOpenLibrary(): void
{
    Http::fake(function (Request $request) {
        $url = urldecode($request->url());

        // A edição brasileira confirma o título em português pelo ISBN.
        if (preg_match('/bibkeys=ISBN:(\d{13})/', $url, $match) === 1) {
            $doc = openLibraryIndex()[$match[1]] ?? null;

            return Http::response($doc === null ? [] : ["ISBN:{$match[1]}" => [
                'title' => $doc['title'],
                'authors' => array_map(fn (string $name) => ['name' => $name], $doc['author_name'] ?? []),
                'cover' => ['large' => 'https://covers.openlibrary.org/b/id/1-L.jpg'],
                'number_of_pages' => 200,
                'subjects' => [['name' => 'Fiction']],
                'description' => 'x',
            ]]);
        }

        if (str_contains($url, 'brasilapi') || str_contains($url, 'googleapis')) {
            return Http::response([], 404);
        }

        return match (true) {
            str_contains($url, 'author=Itamar') => Http::response(apiFixture('open-library/search-author-itamar-vieira.json')),
            str_contains($url, 'author=Machado') => Http::response(apiFixture('open-library/search-author-machado-de-assis.json')),
            str_contains($url, 'subject=Magic') => Http::response(apiFixture('open-library/search-subject-magic-realism.json')),
            default => Http::response(['docs' => []]),
        };
    });
}

/**
 * Documentos das buscas gravadas, por ISBN-13.
 *
 * @return array<string, array<string, mixed>>
 */
function openLibraryIndex(): array
{
    $index = [];

    foreach (['search-author-itamar-vieira', 'search-author-machado-de-assis', 'search-subject-magic-realism'] as $name) {
        foreach (apiFixture("open-library/{$name}.json")['docs'] as $doc) {
            foreach ($doc['isbn'] ?? [] as $isbn) {
                $index[$isbn] ??= $doc;
            }
        }
    }

    return $index;
}

/** Livro da biblioteca com uma leitura avaliada. */
function ratedBook(string $title, string $author, int $rating, ?string $genre = null, ?string $isbn = null): Book
{
    $book = Book::factory()->withAuthors([$author])->create([
        'title' => $title,
        'genre' => $genre,
        'isbn_13' => $isbn,
    ]);

    $book->readings()->create(['status' => ReadingStatus::Read, 'rating' => $rating]);

    return $book;
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

test('busca do mesmo autor e do mesmo assunto, sem repetir a biblioteca', function () {
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

test('por assunto só entra obra com edição brasileira, mesmo gênero e popularidade, com o título em português', function () {
    $doc = fn (string $title, string $isbn, array $extra = []) => $extra + [
        'key' => '/works/OL1W',
        'title' => $title,
        'author_name' => ['Alguém'],
        'isbn' => [$isbn],
        'cover_i' => 1,
        'subject' => ['Fantasy'],
        'edition_count' => 30,
        'want_to_read_count' => 500,
        'ratings_count' => 40,
    ];

    Http::fake(function (Request $request) use ($doc) {
        $url = urldecode($request->url());

        return match (true) {
            str_contains($url, 'subject=Fantasy') => Http::response(['docs' => [
                $doc('The Hobbit', '9788595084742'),
                $doc('Mort', '9781473200319'), // sem edição brasileira
                $doc('Livro raro', '9788535933390', ['want_to_read_count' => 1, 'ratings_count' => 0]),
                $doc('Duna', '9788576573135', ['subject' => ['Science fiction']]),
                $doc('Sem capa', '9788535914849', ['cover_i' => null]),
            ]]),
            str_contains($url, 'bibkeys=ISBN:9788595084742') => Http::response(['ISBN:9788595084742' => [
                'title' => 'O Hobbit',
                'authors' => [['name' => 'J. R. R. Tolkien']],
                'cover' => ['large' => 'https://covers.openlibrary.org/b/id/9-L.jpg'],
                'number_of_pages' => 310,
                'subjects' => [['name' => 'Fantasy']],
                'description' => 'x',
            ]]),
            default => Http::response([], 404),
        };
    });

    ratedBook('Harry Potter', 'J. K. Rowling', 5, 'Fantasia');

    expect(app(RecommendationService::class)->generate())->toBe(1);

    $recommendation = Recommendation::sole();

    expect($recommendation->title)->toBe('O Hobbit')
        ->and($recommendation->author)->toBe('J. R. R. Tolkien')
        ->and($recommendation->reason)->toBe('assunto em comum: Fantasia, como Harry Potter');
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

test('cada busca lê uma página diferente da Open Library', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Fantasia');

    $service = app(RecommendationService::class);
    $service->generate();
    $service->generate();

    $pages = collect(Http::recorded())
        ->map(fn ($pair) => urldecode($pair[0]->url()))
        ->filter(fn ($url) => str_contains($url, 'subject='))
        ->map(fn ($url) => preg_match('/page=(\d+)/', $url, $m) ? (int) $m[1] : null)
        ->values()
        ->all();

    expect($pages)->toBe([1, 2]);
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
    fakeOpenLibrary();
    ratedBook('Dom Casmurro', 'Machado de Assis', 4);

    app(RecommendationService::class)->generate();

    expect(Recommendation::where('title', 'Helena')->count())->toBe(1)
        ->and(Recommendation::where('title', 'Machado de Assis')->exists())->toBeFalse()
        ->and(Recommendation::where('title', 'Dom Casmurro')->exists())->toBeFalse();
});

test('a busca na Open Library é cacheada: só a página nova volta à rede', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    $service = app(RecommendationService::class);
    $service->generate();
    $sent = count(Http::recorded());

    $service->generate();
    // Só a página nova do assunto vai à rede; o autor e as edições já estão em cache.
    Http::assertSentCount($sent + 1);
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

    // Mesmo que a sugestão do dia seja descartada, o dia continua com uma sugestão.
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

test('buscar pela tela gera sugestões e avisa o resultado', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    $this->post(route('suggestions.generate'))
        ->assertRedirect(route('suggestions.index'))
        ->assertSessionHas('toast', fn (array $toast) => str_contains($toast['title'], 'sugest'));

    expect(Recommendation::count())->toBeGreaterThan(0);
});

test('o comando gera as mesmas sugestões do botão', function () {
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
    ]);

    $source = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5);
    $recommendation = Recommendation::factory()->create(['based_on_book_id' => $source->id, 'isbn_13' => '9786580309313', 'work_key' => null]);

    $this->getJson(route('suggestions.editions', $recommendation))->assertOk();

    expect($recommendation->refresh()->work_key)->toBe('OL1003040W');
});
