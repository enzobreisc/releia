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

        return match (true) {
            str_contains($url, 'author=Itamar') => Http::response(apiFixture('open-library/search-author-itamar-vieira.json')),
            str_contains($url, 'author=Machado') => Http::response(apiFixture('open-library/search-author-machado-de-assis.json')),
            str_contains($url, 'subject=Magic') => Http::response(apiFixture('open-library/search-subject-magic-realism.json')),
            default => Http::response(['docs' => []]),
        };
    });
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
            ->and($recommendation->reason)->toMatch('/^(mesmo autor que Torto Arado|assunto em comum: Magic realism \(Literature\))$/');
    }

    expect(Recommendation::where('reason', 'assunto em comum: Magic realism (Literature)')->exists())->toBeTrue();
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

test('a busca na Open Library é cacheada e não volta à rede', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    $service = app(RecommendationService::class);
    $service->generate();
    Http::assertSentCount(2);

    $service->generate();
    Http::assertSentCount(2);
});

test('"quero ler" cria o livro na estante com os metadados do ISBN', function () {
    Http::fake([
        'openlibrary.org/api/books*' => apiFixture('open-library/books-9788535933390.json'),
        'openlibrary.org/search.json*' => Http::response(['docs' => []]),
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
        ->assertSessionHas('message', fn (string $message) => str_contains($message, 'sugestões novas'));

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
