<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

final readonly class OllamaEmbeddingProvider implements EmbeddingProvider
{
    private const EMBED_PATH = '/api/embed';

    private const CONNECT_TIMEOUT_SECONDS = 1;

    /**
     * The task prefix is required by models such as nomic-embed-text, and Ollama does not add it.
     */
    public function __construct(
        private string $url,
        private string $model,
        private string $prefix,
        private int $timeoutSeconds,
    ) {}

    public function embed(array $texts): array
    {
        if ($texts === []) {
            return [];
        }

        return $this->vectorsFrom($this->send($texts), count($texts));
    }

    public function model(): string
    {
        return $this->model;
    }

    /** Guzzle's total timeout includes the connection, so the configured value is the worst case. */
    public function timeoutSeconds(): int
    {
        return $this->timeoutSeconds;
    }

    /** @param  list<string>  $texts */
    private function send(array $texts): Response
    {
        try {
            $response = $this->client()->post(self::EMBED_PATH, [
                'model' => $this->model,
                'input' => array_map(fn (string $text) => $this->prefix.$text, $texts),
            ]);
        } catch (ConnectionException $exception) {
            throw new EmbeddingUnavailable('Ollama is not reachable.', previous: $exception);
        }

        if (! $response->successful()) {
            throw new EmbeddingUnavailable("Ollama answered with status {$response->status()}.");
        }

        return $response;
    }

    /** @return list<list<float>> */
    private function vectorsFrom(Response $response, int $expectedCount): array
    {
        $embeddings = $response->json('embeddings');

        if (! is_array($embeddings) || count($embeddings) !== $expectedCount) {
            throw new EmbeddingUnavailable('Ollama returned an unexpected number of embeddings.');
        }

        return array_map(fn (mixed $vector) => $this->floatVector($vector), array_values($embeddings));
    }

    /** @return list<float> */
    private function floatVector(mixed $vector): array
    {
        if (! is_array($vector) || $vector === []) {
            throw new EmbeddingUnavailable('Ollama returned an empty or invalid embedding.');
        }

        $floats = [];

        foreach ($vector as $value) {
            if (! is_int($value) && ! is_float($value)) {
                throw new EmbeddingUnavailable('Ollama returned a non-numeric embedding value.');
            }

            $floats[] = (float) $value;
        }

        return $floats;
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl($this->url)
            ->acceptJson()
            ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout($this->timeoutSeconds);
    }
}
