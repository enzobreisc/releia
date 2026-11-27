<?php

use App\Enums\RecommendationStatus;
use App\Models\Book;
use App\Models\Recommendation;
use App\Services\Recommendation\RequestedSuggestions;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    Carbon::setTestNow('2026-10-15 09:00:00');
});

/** @param  array<string, mixed>  $filters */
function modelAnswers(array $filters): void
{
    Http::fake([
        '*/api/chat' => Http::response(['message' => ['content' => json_encode($filters, JSON_THROW_ON_ERROR)]]),
        '*/api/show' => Http::response(['modelfile' => '']),
        'openlibrary.org/*' => Http::response(['docs' => []]),
    ]);
}

function interpretRequest(string $text): TestResponse
{
    return test()->postJson(route('suggestions.requests.interpret'), ['text' => $text]);
}

function chatRequestsSent(): int
{
    return Http::recorded(fn (Request $request) => str_ends_with($request->url(), '/api/chat'))->count();
}

test('a request is read into authors matched to your library', function () {
    Book::factory()->withAuthors(['Liev Tolstói'])->create();
    Book::factory()->withAuthors(['Machado de Assis'])->create();
    modelAnswers(['authors' => ['Tolstoi'], 'excluded_authors' => ['Machado'], 'max_pages' => 250, 'understood' => true]);

    interpretRequest('Tolstoi, nada de Machado, curto')
        ->assertOk()
        ->assertExactJson([
            'authors' => ['Liev Tolstói'],
            'excluded_authors' => ['Machado de Assis'],
            'max_pages' => 250,
            'understood' => true,
        ]);
});

test('a request with no usable filter that the model did not understand is not understood', function () {
    modelAnswers(['authors' => [], 'excluded_authors' => [], 'max_pages' => null, 'understood' => false]);

    interpretRequest('como faço um bolo?')
        ->assertOk()
        ->assertJsonPath('understood', false);
});

test('a generic request is understood with no filters', function () {
    modelAnswers(['authors' => [], 'excluded_authors' => [], 'max_pages' => null, 'understood' => true]);

    interpretRequest('me sugere qualquer coisa')->assertJsonPath('understood', true);
});

test('an author the model names that the library does not have is kept as written', function () {
    modelAnswers(['authors' => ['Jane Austen'], 'excluded_authors' => [], 'max_pages' => null, 'understood' => true]);

    interpretRequest('algo da Jane Austen')
        ->assertJsonPath('authors', ['Jane Austen'])
        ->assertJsonPath('understood', true);
});

test('an unreachable Ollama answers 503 with its availability', function () {
    Http::fake(['*/api/chat' => Http::failedConnection()]);

    interpretRequest('mais Clarice')
        ->assertStatus(503)
        ->assertExactJson(['availability' => 'server_unreachable']);
});

test('a model that is not installed answers 503 with its availability', function () {
    Http::fake(['*/api/chat' => Http::response(['error' => 'not found'], 404)]);

    interpretRequest('mais Clarice')
        ->assertStatus(503)
        ->assertExactJson(['availability' => 'model_missing']);
});

test('a request text is required and short', function () {
    interpretRequest('')->assertUnprocessable()->assertJsonValidationErrors('text');
    interpretRequest(str_repeat('a', 201))->assertUnprocessable()->assertJsonValidationErrors('text');
});

test('interpreting a request does not search Open Library', function () {
    modelAnswers(['authors' => ['Clarice Lispector'], 'excluded_authors' => [], 'max_pages' => null, 'understood' => true]);

    interpretRequest('mais Clarice');

    expect(chatRequestsSent())->toBe(1);
    Http::assertSentCount(1);
});

test('a stored request searches for its authors and keeps them in the session', function () {
    Book::factory()->withAuthors(['Clarice Lispector'])->create();
    Http::fake(['openlibrary.org/*' => Http::response(['docs' => []])]);

    $this->post(route('suggestions.requests.store'), [
        'text' => 'mais Clarice',
        'authors' => ['Clarice Lispector'],
        'excluded_authors' => ['Machado de Assis'],
        'max_pages' => 300,
    ])->assertRedirect(route('suggestions.index'));

    expect(session(RequestedSuggestions::SESSION_KEY))->toMatchArray([
        'text' => 'mais Clarice',
        'authors' => ['Clarice Lispector'],
        'excluded_authors' => [],
        'max_pages' => 300,
        'ids' => [],
    ]);
});

test('a stored request does not ask the model again', function () {
    Http::fake(['openlibrary.org/*' => Http::response(['docs' => []])]);

    $this->post(route('suggestions.requests.store'), ['text' => 'mais Clarice', 'authors' => ['Clarice Lispector']]);

    expect(chatRequestsSent())->toBe(0);
});

test('a new request replaces the remembered one', function () {
    Http::fake(['openlibrary.org/*' => Http::response(['docs' => []])]);

    $this->post(route('suggestions.requests.store'), ['text' => 'primeiro']);
    $this->post(route('suggestions.requests.store'), ['text' => 'segundo']);

    expect(session(RequestedSuggestions::SESSION_KEY)['text'])->toBe('segundo');
});

test('a request that finds nothing while Open Library is down says so', function () {
    Http::fake(['openlibrary.org/*' => Http::failedConnection()]);

    $this->post(route('suggestions.requests.store'), ['text' => 'mais', 'authors' => ['Clarice Lispector', 'Jane Austen', 'Machado de Assis']])
        ->assertSessionHas('toast.kind', 'error')
        ->assertSessionHas('toast.title', 'A Open Library está indisponível');
});

test('a request page limit must be between 1 and 10000 pages', function () {
    $this->post(route('suggestions.requests.store'), ['text' => 'x', 'max_pages' => 0])->assertSessionHasErrors('max_pages');
    $this->post(route('suggestions.requests.store'), ['text' => 'x', 'max_pages' => 10001])->assertSessionHasErrors('max_pages');
});

test('the suggestions page shows the remembered request with its pending results', function () {
    Book::factory()->withAuthors(['Autor 1'])->create();
    Http::fake(['openlibrary.org/*' => Http::response(['docs' => []])]);
    $pending = Recommendation::factory()->create(['title' => 'Obra antiga', 'author' => 'Autor 1', 'status' => RecommendationStatus::New]);

    $this->post(route('suggestions.requests.store'), ['text' => 'mais do Autor 1', 'authors' => ['Autor 1']]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('suggestions')
            ->where('request.text', 'mais do Autor 1')
            ->where('request.authors', ['Autor 1'])
            ->where('request.excluded_authors', [])
            ->where('request.max_pages', null)
            ->has('request.results', 1)
            ->where('request.results.0.id', $pending->id)
            ->where('interpreter.model', config('services.ollama.chat_model'))
            ->missing('request.results.1'));
});

test('the pending list leaves out the books the remembered request answers with', function () {
    $answer = Recommendation::factory()->create(['title' => 'Resposta', 'author' => 'Autor 1', 'status' => RecommendationStatus::New]);
    $other = Recommendation::factory()->create(['title' => 'Outra', 'author' => 'Autor 2', 'status' => RecommendationStatus::New]);
    session([RequestedSuggestions::SESSION_KEY => [
        'text' => 'mais do Autor 1',
        'authors' => ['Autor 1'],
        'excluded_authors' => [],
        'max_pages' => null,
        'ids' => [$answer->id],
    ]]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('suggestions', 1)
            ->where('suggestions.0.id', $other->id)
            ->has('request.results', 1));
});

test('the request reports every book it found, even once one of them is accepted', function () {
    $first = Recommendation::factory()->create(['title' => 'Primeiro', 'author' => 'Autor 1', 'status' => RecommendationStatus::New]);
    $second = Recommendation::factory()->create(['title' => 'Segundo', 'author' => 'Autor 1', 'status' => RecommendationStatus::New]);
    session([RequestedSuggestions::SESSION_KEY => [
        'text' => 'mais do Autor 1',
        'authors' => ['Autor 1'],
        'excluded_authors' => [],
        'max_pages' => null,
        'ids' => [$first->id, $second->id],
    ]]);

    $first->update(['status' => RecommendationStatus::WantToRead]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('request.found', 2)
            ->has('request.results', 1));
});

test('a request that finds nothing while Open Library is down keeps the remembered request', function () {
    Http::fake(['openlibrary.org/*' => Http::failedConnection()]);

    $this->withSession([RequestedSuggestions::SESSION_KEY => [
        'text' => 'pedido anterior',
        'authors' => [],
        'excluded_authors' => [],
        'max_pages' => null,
        'ids' => [],
    ]])->post(route('suggestions.requests.store'), ['text' => 'mais', 'authors' => ['Clarice Lispector', 'Jane Austen', 'Machado de Assis']])
        ->assertSessionHas('toast.kind', 'error')
        ->assertSessionHasErrors(['search' => 'A Open Library está indisponível']);

    expect(session(RequestedSuggestions::SESSION_KEY)['text'])->toBe('pedido anterior');
});

test('the suggestions page has no request before one is made', function () {
    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page->where('request', null));
});

test('the availability of the interpreter is loaded after the page', function () {
    Http::fake(['*/api/show' => Http::response(['modelfile' => ''])]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->missing('interpreterAvailability')
            ->loadDeferredProps(fn (Assert $reloaded) => $reloaded->where('interpreterAvailability', 'ready')));
});

test('a request with a usable author is understood even when the model did not understand it', function () {
    Book::factory()->withAuthors(['Clarice Lispector'])->create();
    modelAnswers(['authors' => ['Clarice Lispector'], 'excluded_authors' => [], 'max_pages' => null, 'understood' => false]);

    interpretRequest('algo da Clarice')->assertJsonPath('understood', true);
});

test('a request can store more than five authors, so an interpreted list of that size is accepted', function () {
    Http::fake(['openlibrary.org/*' => Http::response(['docs' => []])]);
    $names = ['Ana Um', 'Bia Dois', 'Caio Três', 'Dora Quatro', 'Eva Cinco', 'Fábio Seis'];

    $this->post(route('suggestions.requests.store'), ['text' => 'x', 'authors' => $names])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('suggestions.index'));
});

test('a request names at most twenty authors', function () {
    $names = array_map(fn (int $number) => "Autor {$number}", range(1, 21));

    $this->post(route('suggestions.requests.store'), ['text' => 'x', 'authors' => $names])->assertSessionHasErrors('authors');
});

test('the interpreted authors are at most twenty, so storing them is accepted', function () {
    foreach (range(1, 21) as $number) {
        Book::factory()->withAuthors(["Ana Tolstoi {$number}"])->create();
    }
    modelAnswers(['authors' => ['Tolstoi'], 'excluded_authors' => [], 'max_pages' => null, 'understood' => true]);

    $authors = interpretRequest('Tolstoi')->json('authors');

    expect($authors)->toHaveCount(20);

    $this->post(route('suggestions.requests.store'), ['text' => 'Tolstoi', 'authors' => $authors])
        ->assertSessionHasNoErrors();
});

test('an interpretation that cannot connect in time answers 503 as an unreachable server', function () {
    Http::fake(['*/api/chat' => Http::failedConnection('cURL error 28: Connection timed out after 1001 milliseconds')]);

    interpretRequest('mais Clarice')
        ->assertStatus(503)
        ->assertJsonPath('availability', 'server_unreachable');
});

test('an interpretation that times out answers 504, not 503, so the screen shows its generic failure', function () {
    Http::fake(['*/api/chat' => Http::failedConnection('cURL error 28: Operation timed out after 60000 milliseconds')]);

    interpretRequest('mais Clarice')->assertStatus(504);
});
