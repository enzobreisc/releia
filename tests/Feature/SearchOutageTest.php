<?php

use App\Models\Setting;
use App\Services\Recommendation\SearchScope;
use App\Services\Recommendation\SourceBooks;
use App\Services\Recommendation\SuggestionCollector;
use App\Services\Recommendation\SuggestionSearch;
use App\Services\RecommendationService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

function rateBooksByAuthors(int $count): void
{
    foreach (range(1, $count) as $number) {
        ratedBook("Livro {$number}", "Autor {$number}", 5);
    }
}

function authorRequests(): int
{
    return Http::recorded(fn (Request $request) => str_contains($request->url(), 'author='))->count();
}

function takeOpenLibraryDown(): void
{
    Http::fake(['openlibrary.org/*' => Http::failedConnection()]);
}

test('a search gives up after Open Library fails three times in a row', function () {
    takeOpenLibraryDown();
    rateBooksByAuthors(6);

    expect(app(RecommendationService::class)->generate())->toBe(0);

    Http::assertSentCount(3);
});

test('server errors count as failures too', function () {
    Http::fake(['openlibrary.org/*' => Http::response([], 503)]);
    rateBooksByAuthors(6);

    app(RecommendationService::class)->generate();

    Http::assertSentCount(3);
});

test('empty answers are not failures, so every source is searched', function () {
    Http::fake(['openlibrary.org/*' => Http::response(['docs' => []])]);
    rateBooksByAuthors(6);

    app(RecommendationService::class)->generate();

    expect(authorRequests())->toBe(6);
});

test('a failed page is not followed by a request for the first one', function () {
    takeOpenLibraryDown();
    rateBooksByAuthors(1);
    Setting::put('suggestion-round', 1);

    app(RecommendationService::class)->generate();

    expect(authorRequests())->toBe(1);
});

test('a search that found Open Library down reads the same page next time', function () {
    takeOpenLibraryDown();
    rateBooksByAuthors(6);
    Setting::put('suggestion-round', 1);

    app(RecommendationService::class)->generate();

    expect(Setting::get('suggestion-round'))->toBe(1);
});

test('the reader is told that Open Library is unavailable', function () {
    takeOpenLibraryDown();
    rateBooksByAuthors(6);

    $this->post(route('suggestions.requests.store'), ['text' => 'mais', 'authors' => ['Autor 1', 'Autor 2', 'Autor 3']])
        ->assertSessionHas('toast.kind', 'error')
        ->assertSessionHas('toast.title', 'A Open Library está indisponível')
        ->assertSessionHasErrors(['search' => 'A Open Library está indisponível']);
});

test('the command says Open Library is down when nothing was added because of it', function () {
    takeOpenLibraryDown();
    rateBooksByAuthors(6);

    $this->artisan('releia:suggestions')
        ->expectsOutputToContain('A Open Library está indisponível')
        ->doesntExpectOutputToContain('sugestões novas')
        ->assertSuccessful();
});

test('the command says no new suggestion when the search finds none', function () {
    Http::fake(['openlibrary.org/*' => Http::response(['docs' => []])]);
    rateBooksByAuthors(2);

    $this->artisan('releia:suggestions')
        ->expectsOutputToContain('Nenhuma sugestão nova')
        ->doesntExpectOutputToContain('A Open Library está indisponível')
        ->assertSuccessful();
});

test('no source is searched after the time budget is over', function () {
    Http::fake();
    rateBooksByAuthors(2);

    $found = app(SuggestionCollector::class)->collect(app(SourceBooks::class)->pick(), new SuggestionSearch(SearchScope::general(), [], [], microtime(true) - 1), 1);

    expect($found)->toBe([]);
    Http::assertNothingSent();
});
