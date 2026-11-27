<?php

namespace App\Services\Ai;

use App\Http\Requests\InputLimits;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

final readonly class OllamaRequestInterpreter implements RequestInterpreter
{
    private const CHAT_PATH = '/api/chat';

    private const SHOW_PATH = '/api/show';

    private const CONNECT_TIMEOUT_SECONDS = 1;

    private const PROBE_TIMEOUT_SECONDS = 2;

    private const KEEP_ALIVE = '5m';

    private const CONTEXT_TOKENS = 4096;

    private const ANSWER_TOKENS = 200;

    private const FORMAT = [
        'type' => 'object',
        'properties' => [
            'authors' => ['type' => 'array', 'items' => ['type' => 'string']],
            'excluded_authors' => ['type' => 'array', 'items' => ['type' => 'string']],
            'max_pages' => ['type' => ['integer', 'null']],
            'understood' => ['type' => 'boolean'],
        ],
        'required' => ['authors', 'excluded_authors', 'max_pages', 'understood'],
    ];

    public function __construct(
        private string $url,
        private string $model,
        private int $timeoutSeconds,
    ) {}

    public function interpret(string $text): ReadingFilters
    {
        try {
            $response = $this->client($this->timeoutSeconds)->post(self::CHAT_PATH, [
                'model' => $this->model,
                'messages' => InterpreterPrompt::messages($text),
                'stream' => false,
                'think' => false,
                'keep_alive' => self::KEEP_ALIVE,
                'format' => self::FORMAT,
                'options' => [
                    'temperature' => 0,
                    'num_ctx' => self::CONTEXT_TOKENS,
                    'num_predict' => self::ANSWER_TOKENS,
                ],
            ]);
        } catch (ConnectionException $exception) {
            throw new InterpreterUnavailable(InterpreterAvailability::ServerUnreachable, $exception);
        }

        $this->ensureAnswered($response);

        return $this->filtersFrom($response->json('message.content'));
    }

    /** Ollama answers 404 for a model that was never pulled, and refuses connections when it is not running. */
    public function availability(): InterpreterAvailability
    {
        try {
            $response = $this->client(self::PROBE_TIMEOUT_SECONDS)->post(self::SHOW_PATH, ['model' => $this->model]);
        } catch (ConnectionException) {
            return InterpreterAvailability::ServerUnreachable;
        }

        if ($response->successful()) {
            return InterpreterAvailability::Ready;
        }

        return $response->notFound() ? InterpreterAvailability::ModelMissing : InterpreterAvailability::ServerUnreachable;
    }

    private function ensureAnswered(Response $response): void
    {
        if ($response->successful()) {
            return;
        }

        throw new InterpreterUnavailable($response->notFound()
            ? InterpreterAvailability::ModelMissing
            : InterpreterAvailability::ServerUnreachable);
    }

    /**
     * Model output is untrusted: anything that does not have the expected shape is dropped, and an answer
     * that is not JSON means the request was not understood.
     */
    private function filtersFrom(mixed $content): ReadingFilters
    {
        $answer = is_string($content) ? json_decode($content, true) : null;

        if (! is_array($answer)) {
            return new ReadingFilters(understood: false);
        }

        return new ReadingFilters(
            authors: $this->namesFrom($answer['authors'] ?? null),
            excludedAuthors: $this->namesFrom($answer['excluded_authors'] ?? null),
            maxPages: $this->pageLimitFrom($answer['max_pages'] ?? null),
            understood: ($answer['understood'] ?? false) === true,
        );
    }

    /** @return list<string> */
    private function namesFrom(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        $names = [];

        foreach ($value as $name) {
            $trimmed = is_string($name) ? trim($name) : '';

            if ($trimmed !== '' && mb_strlen($trimmed) <= InputLimits::SUGGESTION_AUTHOR_NAME) {
                $names[] = $trimmed;
            }
        }

        return array_slice(array_values(array_unique($names)), 0, InputLimits::SUGGESTION_MODEL_AUTHORS);
    }

    private function pageLimitFrom(mixed $maxPages): ?int
    {
        return is_int($maxPages) && $maxPages > 0 && $maxPages <= InputLimits::SUGGESTION_PAGES ? $maxPages : null;
    }

    private function client(int $timeoutSeconds): PendingRequest
    {
        return Http::baseUrl($this->url)
            ->acceptJson()
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout($timeoutSeconds);
    }
}
