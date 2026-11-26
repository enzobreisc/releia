<?php

namespace App\Services\Ai;

interface EmbeddingProvider
{
    /**
     * @param  list<string>  $texts
     * @return list<list<float>> one vector per text, in the same order
     *
     * @throws EmbeddingUnavailable
     */
    public function embed(array $texts): array;

    /** Identifier of the model, used to key stored vectors. */
    public function model(): string;

    /** Worst-case seconds one embed call may take, so callers can budget for it. */
    public function timeoutSeconds(): int;

    /** Whether the embedding model can answer right now. Never throws. */
    public function availability(): EmbeddingAvailability;
}
