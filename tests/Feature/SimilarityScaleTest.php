<?php

use App\Services\Ai\SimilarityScale;
use Illuminate\Support\Facades\Log;

test('rejects a ceiling equal to the floor', function () {
    expect(fn () => new SimilarityScale(floor: 0.8, ceiling: 0.8))->toThrow(InvalidArgumentException::class);
});

test('rejects a ceiling below the floor', function () {
    expect(fn () => new SimilarityScale(floor: 0.9, ceiling: 0.5))->toThrow(InvalidArgumentException::class);
});

test('clamps cosines below the floor to zero and above the ceiling to one', function () {
    $scale = new SimilarityScale(floor: 0.63, ceiling: 0.94);

    expect($scale->normalize(0.5))->toBe(0.0)
        ->and($scale->normalize(0.99))->toBe(1.0);
});

test('falls back to the default range when the configured pair is invalid', function () {
    Log::spy();
    config()->set('services.ollama.similarity_floor', '0.9');
    config()->set('services.ollama.similarity_ceiling', '0.5');

    $scale = app(SimilarityScale::class);

    expect($scale->normalize(0.785))->toEqualWithDelta(0.5, 1e-9);
    Log::shouldHaveReceived('warning')->once();
});

test('treats an empty configured value as unset and uses the default range', function () {
    Log::spy();
    config()->set('services.ollama.similarity_floor', '');
    config()->set('services.ollama.similarity_ceiling', '');

    $scale = app(SimilarityScale::class);

    expect($scale->normalize(0.785))->toEqualWithDelta(0.5, 1e-9);
    Log::shouldNotHaveReceived('warning');
});
