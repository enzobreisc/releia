<?php

use App\Services\Ai\EmbeddingProvider;
use App\Services\Ai\EmbeddingUnavailable;
use App\Services\Ai\OllamaEmbeddingProvider;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

const OLLAMA_EMBED_URL = 'http://ollama.test/api/embed';

function ollamaEmbeddings(): OllamaEmbeddingProvider
{
    return new OllamaEmbeddingProvider('http://ollama.test', 'nomic-embed-text', 'clustering: ', 5);
}

test('sends one batch request with prefixed inputs and returns vectors in order', function () {
    Http::fake([
        OLLAMA_EMBED_URL => Http::response([
            'model' => 'nomic-embed-text',
            'embeddings' => [[0.1, -0.2], [0.3, 0.4]],
        ]),
    ]);

    $vectors = ollamaEmbeddings()->embed(['Drama', 'Fantasia']);

    expect($vectors)->toBe([[0.1, -0.2], [0.3, 0.4]]);
    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request) => $request->url() === OLLAMA_EMBED_URL
        && $request['model'] === 'nomic-embed-text'
        && $request['input'] === ['clustering: Drama', 'clustering: Fantasia']);
});

test('casts integer vector values to floats', function () {
    Http::fake([OLLAMA_EMBED_URL => Http::response(['embeddings' => [[1, 2]]])]);

    expect(ollamaEmbeddings()->embed(['Drama']))->toBe([[1.0, 2.0]]);
});

test('returns no vectors and sends nothing for empty input', function () {
    expect(ollamaEmbeddings()->embed([]))->toBe([]);

    Http::assertNothingSent();
});

test('exposes the configured model identifier', function () {
    expect(ollamaEmbeddings()->model())->toBe('nomic-embed-text');
});

test('exposes the configured timeout as its worst-case duration', function () {
    expect(ollamaEmbeddings()->timeoutSeconds())->toBe(5);
});

test('throws when Ollama is not reachable', function () {
    Http::fake(fn () => Http::failedConnection('Connection refused'));

    expect(fn () => ollamaEmbeddings()->embed(['Drama']))->toThrow(EmbeddingUnavailable::class);
});

test('throws when the model is not pulled', function () {
    Http::fake([OLLAMA_EMBED_URL => Http::response(['error' => 'model "nomic-embed-text" not found'], 404)]);

    expect(fn () => ollamaEmbeddings()->embed(['Drama']))->toThrow(EmbeddingUnavailable::class);
});

test('throws when the number of vectors differs from the number of inputs', function () {
    Http::fake([OLLAMA_EMBED_URL => Http::response(['embeddings' => [[0.1, 0.2]]])]);

    expect(fn () => ollamaEmbeddings()->embed(['Drama', 'Fantasia']))->toThrow(EmbeddingUnavailable::class);
});

test('throws when the response body is malformed', function (array $body) {
    Http::fake([OLLAMA_EMBED_URL => Http::response($body)]);

    expect(fn () => ollamaEmbeddings()->embed(['Drama']))->toThrow(EmbeddingUnavailable::class);
})->with([
    'missing embeddings' => [['model' => 'nomic-embed-text']],
    'embeddings is not a list of vectors' => [['embeddings' => 'not-a-list']],
    'empty vector' => [['embeddings' => [[]]]],
    'non-numeric value' => [['embeddings' => [[0.1, 'abc']]]],
]);

test('resolves the embedding interface to the Ollama provider', function () {
    expect(app(EmbeddingProvider::class))->toBeInstanceOf(OllamaEmbeddingProvider::class);
});
