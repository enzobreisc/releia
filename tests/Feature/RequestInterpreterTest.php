<?php

use App\Services\Ai\InterpreterAvailability;
use App\Services\Ai\InterpreterUnavailable;
use App\Services\Ai\ReadingFilters;
use App\Services\Ai\RequestInterpreter;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

function chatAnswer(array $filters): array
{
    return ['message' => ['role' => 'assistant', 'content' => json_encode($filters, JSON_THROW_ON_ERROR)]];
}

function interpreter(): RequestInterpreter
{
    return app(RequestInterpreter::class);
}

test('the request is a single non-streaming chat without thinking', function () {
    Http::fake(['*/api/chat' => Http::response(chatAnswer(['authors' => [], 'excluded_authors' => [], 'max_pages' => null, 'understood' => true]))]);

    interpreter()->interpret('mais da Clarice Lispector');

    Http::assertSent(function (Request $request) {
        return str_ends_with($request->url(), '/api/chat')
            && $request['stream'] === false
            && $request['think'] === false
            && $request['keep_alive'] === '5m'
            && $request['options'] === ['temperature' => 0, 'num_ctx' => 4096, 'num_predict' => 200]
            && $request['format']['required'] === ['authors', 'excluded_authors', 'max_pages', 'understood'];
    });
});

test('the system prompt and the examples come before the request', function () {
    Http::fake(['*/api/chat' => Http::response(chatAnswer(['authors' => [], 'excluded_authors' => [], 'max_pages' => null, 'understood' => true]))]);

    interpreter()->interpret('algo curto da Jane Austen');

    Http::assertSent(function (Request $request) {
        $messages = $request['messages'];

        return count($messages) === 20
            && $messages[0]['role'] === 'system'
            && str_starts_with($messages[0]['content'], 'Você converte um pedido de leitura em filtros de busca. Não recomende livros.')
            && $messages[1] === ['role' => 'user', 'content' => 'mais livros da Clarice Lispector']
            && $messages[19] === ['role' => 'user', 'content' => 'algo curto da Jane Austen'];
    });
});

test('theme and similar-book requests are examples that are not understood', function () {
    Http::fake(['*/api/chat' => Http::response(chatAnswer(['authors' => [], 'excluded_authors' => [], 'max_pages' => null, 'understood' => true]))]);

    interpreter()->interpret('algo parecido com Dom Casmurro');

    Http::assertSent(function (Request $request) {
        $messages = $request['messages'];
        $notUnderstood = ['role' => 'assistant', 'content' => json_encode(['authors' => [], 'excluded_authors' => [], 'max_pages' => null, 'understood' => false], JSON_THROW_ON_ERROR)];

        return $messages[13] === ['role' => 'user', 'content' => 'um livro de fantasia']
            && $messages[14] === ['role' => 'assistant', 'content' => $notUnderstood['content']]
            && $messages[15] === ['role' => 'user', 'content' => 'algo parecido com Dom Casmurro']
            && $messages[16] === $notUnderstood
            && $messages[17] === ['role' => 'user', 'content' => 'como faço um bolo?'];
    });
});

test('the model answer becomes the filters', function () {
    Http::fake(['*/api/chat' => Http::response(chatAnswer([
        'authors' => ['Liev Tolstói'],
        'excluded_authors' => ['Machado de Assis'],
        'max_pages' => 250,
        'understood' => true,
    ]))]);

    $filters = interpreter()->interpret('Tolstói, nada de Machado, curto');

    expect($filters)->toEqual(new ReadingFilters(
        authors: ['Liev Tolstói'],
        excludedAuthors: ['Machado de Assis'],
        maxPages: 250,
        understood: true,
    ));
});

test('a model that is not installed is reported as a missing model', function () {
    Http::fake(['*/api/chat' => Http::response(['error' => 'model not found'], 404)]);

    expect(fn () => interpreter()->interpret('qualquer coisa'))->toThrow(InterpreterUnavailable::class);
});

test('a missing model keeps its availability for the page', function () {
    Http::fake(['*/api/chat' => Http::response(['error' => 'model not found'], 404)]);

    $thrown = null;

    try {
        interpreter()->interpret('qualquer coisa');
    } catch (InterpreterUnavailable $exception) {
        $thrown = $exception;
    }

    expect($thrown)->toBeInstanceOf(InterpreterUnavailable::class)
        ->and($thrown?->availability)->toBe(InterpreterAvailability::ModelMissing);
});

test('a server that refuses the connection is reported as unreachable', function () {
    Http::fake(['*/api/chat' => Http::failedConnection()]);

    try {
        interpreter()->interpret('qualquer coisa');

        $this->fail('The interpreter should be unavailable.');
    } catch (InterpreterUnavailable $exception) {
        expect($exception->availability)->toBe(InterpreterAvailability::ServerUnreachable);
    }
});

test('an answer that is not JSON counts as not understood', function () {
    Http::fake(['*/api/chat' => Http::response(['message' => ['content' => 'Claro! Aqui vai uma lista.']])]);

    expect(interpreter()->interpret('algo'))->toEqual(new ReadingFilters(understood: false));
});

test('an answer without a message counts as not understood', function () {
    Http::fake(['*/api/chat' => Http::response(['done' => true])]);

    expect(interpreter()->interpret('algo'))->toEqual(new ReadingFilters(understood: false));
});

test('untrusted values from the model are cleaned before they are used', function () {
    Http::fake(['*/api/chat' => Http::response(chatAnswer([
        'authors' => ['  Clarice Lispector  ', '', '   ', 42, null, str_repeat('x', 101), 'Jane Austen', 'Jane Austen'],
        'excluded_authors' => ['A', 'B', 'C', 'D', 'E', 'F'],
        'max_pages' => 0,
        'understood' => 'yes',
    ]))]);

    $filters = interpreter()->interpret('algo');

    expect($filters->authors)->toBe(['Clarice Lispector', 'Jane Austen'])
        ->and($filters->excludedAuthors)->toBe(['A', 'B', 'C', 'D', 'E'])
        ->and($filters->maxPages)->toBeNull()
        ->and($filters->understood)->toBeFalse();
});

test('a page limit must be a positive integer', function (mixed $maxPages, ?int $expected) {
    Http::fake(['*/api/chat' => Http::response(chatAnswer(['authors' => [], 'excluded_authors' => [], 'max_pages' => $maxPages, 'understood' => true]))]);

    expect(interpreter()->interpret('algo')->maxPages)->toBe($expected);
})->with([
    'a positive integer' => [300, 300],
    'zero' => [0, null],
    'negative' => [-5, null],
    'a float' => [300.5, null],
    'a string' => ['300', null],
    'null' => [null, null],
]);

test('a list that is not an array is read as empty', function () {
    Http::fake(['*/api/chat' => Http::response(chatAnswer(['authors' => 'Clarice', 'excluded_authors' => null, 'max_pages' => null, 'understood' => true]))]);

    expect(interpreter()->interpret('algo'))->toEqual(new ReadingFilters(understood: true));
});

test('a reachable server with the model installed is ready', function () {
    Http::fake(['*/api/show' => Http::response(['modelfile' => ''])]);

    expect(interpreter()->availability())->toBe(InterpreterAvailability::Ready);
});

test('availability reports a model that was never pulled', function () {
    Http::fake(['*/api/show' => Http::response(['error' => 'not found'], 404)]);

    expect(interpreter()->availability())->toBe(InterpreterAvailability::ModelMissing);
});

test('availability reports a stopped server', function () {
    Http::fake(['*/api/show' => Http::failedConnection()]);

    expect(interpreter()->availability())->toBe(InterpreterAvailability::ServerUnreachable);
});
