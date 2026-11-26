<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\BookEmbedding;
use App\Models\Reading;
use App\Services\Ai\SimilarityScale;
use App\Services\Recommendation\TasteProfile;

const CANDIDATE_VECTOR = [1.0, 0.0];

/**
 * A unit vector whose cosine to CANDIDATE_VECTOR is exactly the given value.
 *
 * @return list<float>
 */
function vectorWithCosine(float $cosine): array
{
    return [$cosine, sqrt(1 - $cosine ** 2)];
}

function profileReading(?array $vector, ?int $rating, ?string $model = null): Reading
{
    $book = Book::factory()->create();

    if ($vector !== null) {
        BookEmbedding::query()->create([
            'book_id' => $book->id,
            'model' => $model ?? configuredEmbeddingModel(),
            'vector' => $vector,
            'source_hash' => 'hash',
        ]);
    }

    return $book->readings()->create(['status' => ReadingStatus::Read, 'rating' => $rating]);
}

/**
 * @param  list<Reading>  $readings
 */
function profileOf(array $readings, ?string $model = null): TasteProfile
{
    return TasteProfile::fromReadings(
        collect($readings),
        $model ?? configuredEmbeddingModel(),
        new SimilarityScale(floor: 0.63, ceiling: 0.94),
    );
}

function similarityOfSingleReading(float $cosine, int $rating): float
{
    return profileOf([profileReading(vectorWithCosine($cosine), $rating)])->similarityTo(CANDIDATE_VECTOR);
}

test('a 4-star book that is close to the candidate beats a 5-star book that is further away', function () {
    $fourStar = similarityOfSingleReading(0.90, 4);
    $fiveStar = similarityOfSingleReading(0.70, 5);

    expect($fourStar)->toBeGreaterThan($fiveStar);
});

test('a near 4-star book outscores a far 5-star book in the same profile', function () {
    $profile = profileOf([
        profileReading(vectorWithCosine(0.90), 4),
        profileReading(vectorWithCosine(0.70), 5),
    ]);

    expect($profile->similarityTo(CANDIDATE_VECTOR))->toEqualWithDelta(0.6 * 0.27 / 0.31, 1e-6);
});

test('a cosine at the floor scores zero', function () {
    expect(similarityOfSingleReading(0.63, 5))->toEqualWithDelta(0.0, 1e-6);
});

test('a cosine below the floor scores zero', function () {
    expect(similarityOfSingleReading(0.40, 5))->toBe(0.0);
});

test('a cosine above the ceiling is clamped to the rating weight', function () {
    expect(similarityOfSingleReading(0.99, 5))->toBe(1.0)
        ->and(similarityOfSingleReading(0.99, 4))->toBe(0.6);
});

test('a 3-star book counts with its own weight', function () {
    expect(similarityOfSingleReading(0.94, 3))->toEqualWithDelta(0.3, 1e-6);
});

test('a 2-star book counts with its own weight', function () {
    expect(similarityOfSingleReading(0.94, 2))->toEqualWithDelta(0.1, 1e-6);
});

test('a 1-star book does not shape the profile', function () {
    $profile = profileOf([profileReading(vectorWithCosine(0.94), 1)]);

    expect($profile->isEmpty())->toBeTrue();
});

test('an unrated book does not shape the profile', function () {
    $profile = profileOf([profileReading(vectorWithCosine(0.94), null)]);

    expect($profile->isEmpty())->toBeTrue();
});

test('a profile without any book with a vector is empty', function () {
    $profile = profileOf([profileReading(null, 5)]);

    expect($profile->isEmpty())->toBeTrue();
});

test('ignores vectors computed by another model', function () {
    $profile = profileOf([profileReading(vectorWithCosine(0.94), 5, model: 'other-model')]);

    expect($profile->isEmpty())->toBeTrue();
});

test('ignores book vectors whose size differs from the candidate vector', function () {
    $profile = profileOf([
        profileReading([1.0, 0.0, 0.0], 5),
        profileReading([0.0, 1.0], 4),
    ]);

    expect($profile->similarityTo([0.0, 1.0]))->toEqualWithDelta(0.6, 1e-6);
});

test('scores zero when no book vector has the candidate vector size', function () {
    $profile = profileOf([profileReading([1.0, 0.0, 0.0], 5)]);

    expect($profile->similarityTo(CANDIDATE_VECTOR))->toBe(0.0)
        ->and($profile->similarityTo([]))->toBe(0.0);
});
