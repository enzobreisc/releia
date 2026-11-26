<?php

use App\Models\Setting;
use App\Services\Recommendation\EmbeddingRanker;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

const OLLAMA_SHOW_URL = '*/api/show';

test('turning local AI on persists the setting and confirms it', function () {
    $this->from(route('suggestions.index'))->put(route('suggestions.ai'), ['enabled' => true])
        ->assertRedirect(route('suggestions.index'))
        ->assertSessionHas('toast.title', 'IA local ativada');

    expect(Setting::get(EmbeddingRanker::SETTING))->toBeTrue();
});

test('turning local AI off persists the setting and confirms it', function () {
    Setting::put(EmbeddingRanker::SETTING, true);

    $this->from(route('suggestions.index'))->put(route('suggestions.ai'), ['enabled' => false])
        ->assertRedirect(route('suggestions.index'))
        ->assertSessionHas('toast.title', 'IA local desativada');

    expect(Setting::get(EmbeddingRanker::SETTING))->toBeFalse();
});

test('turning local AI on returns to the active search', function () {
    $searchPage = route('suggestions.index', ['q' => 'Dostoiévski']);

    $this->from($searchPage)->put(route('suggestions.ai'), ['enabled' => true])
        ->assertRedirect($searchPage);
});

test('rejects a value that is not a boolean and keeps the setting unchanged', function () {
    Setting::put(EmbeddingRanker::SETTING, true);

    $this->put(route('suggestions.ai'), ['enabled' => 'maybe'])->assertSessionHasErrors('enabled');

    expect(Setting::get(EmbeddingRanker::SETTING))->toBeTrue();
});

test('rejects a missing value and keeps the setting unchanged', function () {
    $this->put(route('suggestions.ai'), [])->assertSessionHasErrors('enabled');

    expect(Setting::get(EmbeddingRanker::SETTING))->toBeNull();
});

test('the suggestions page sends no request to Ollama while local AI is off', function () {
    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('aiRanking', ['enabled' => false, 'model' => 'nomic-embed-text'])
            ->has('aiAvailability')
            ->where('aiAvailability', null));

    Http::assertNothingSent();
});

test('the suggestions page leaves the availability out of the first render while local AI is on', function () {
    Setting::put(EmbeddingRanker::SETTING, true);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('aiRanking.enabled', true)
            ->missing('aiAvailability'));

    Http::assertNothingSent();
});

test('the deferred availability resolves to ready when Ollama has the model', function () {
    Setting::put(EmbeddingRanker::SETTING, true);
    Http::fake([OLLAMA_SHOW_URL => Http::response(['modelfile' => 'FROM nomic-embed-text'])]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->loadDeferredProps(fn (Assert $reload) => $reload->where('aiAvailability', 'ready')));

    Http::assertSent(fn (Request $request) => str_ends_with($request->url(), '/api/show')
        && $request['model'] === 'nomic-embed-text');
});

test('the deferred availability resolves to server_unreachable when Ollama is down', function () {
    Setting::put(EmbeddingRanker::SETTING, true);
    Http::fake([OLLAMA_SHOW_URL => Http::failedConnection('Connection refused')]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->loadDeferredProps(fn (Assert $reload) => $reload->where('aiAvailability', 'server_unreachable')));
});

test('the deferred availability resolves to model_missing when the model is not pulled', function () {
    Setting::put(EmbeddingRanker::SETTING, true);
    Http::fake([OLLAMA_SHOW_URL => Http::response(['error' => "model 'nomic-embed-text' not found"], 404)]);

    $this->get(route('suggestions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->loadDeferredProps(fn (Assert $reload) => $reload->where('aiAvailability', 'model_missing')));
});

test('the home page sends no Ollama request even when local AI is on', function () {
    Setting::put(EmbeddingRanker::SETTING, true);

    $this->get('/')->assertOk();

    Http::assertNothingSent();
});
