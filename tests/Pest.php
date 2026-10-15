<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => Http::preventStrayRequests())
    ->in('Feature');

/**
 * Resposta real gravada de uma API externa (tests/Fixtures).
 *
 * @return array<mixed>
 */
function apiFixture(string $path): array
{
    return json_decode((string) file_get_contents(__DIR__.'/Fixtures/'.$path), true);
}
