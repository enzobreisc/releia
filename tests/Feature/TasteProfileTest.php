<?php

use App\Models\Book;
use App\Models\BookEmbedding;
use App\Services\Recommendation\TasteProfile;

const FIVE_STAR_WEIGHT = 1.0;

const FOUR_STAR_WEIGHT = 0.7;

/**
 * @param  list<float>  $vector
 * @return array{0: Book, 1: float}
 */
function tasteEntry(array $vector, float $weight, ?string $model = null): array
{
    $book = Book::factory()->create();

    BookEmbedding::query()->create([
        'book_id' => $book->id,
        'model' => $model ?? configuredEmbeddingModel(),
        'vector' => $vector,
        'source_hash' => 'hash',
    ]);

    return [$book, $weight];
}

test('a candidate near a 5-star book scores above one equally near a 4-star book', function () {
    $profile = TasteProfile::fromLiked(
        collect([tasteEntry([1.0, 0.0], FIVE_STAR_WEIGHT), tasteEntry([0.0, 1.0], FOUR_STAR_WEIGHT)]),
        configuredEmbeddingModel(),
    );

    expect($profile->similarityTo([1.0, 0.0]))->toBeGreaterThan($profile->similarityTo([0.0, 1.0]));
});

test('a profile without any liked book with a vector is empty', function () {
    $profile = TasteProfile::fromLiked(collect([[Book::factory()->create(), FIVE_STAR_WEIGHT]]), configuredEmbeddingModel());

    expect($profile->isEmpty())->toBeTrue();
});

test('ignores vectors computed by another model', function () {
    $profile = TasteProfile::fromLiked(
        collect([tasteEntry([1.0, 0.0], FIVE_STAR_WEIGHT, model: 'other-model')]),
        configuredEmbeddingModel(),
    );

    expect($profile->isEmpty())->toBeTrue();
});

test('ignores liked vectors whose size differs from the candidate vector', function () {
    $profile = TasteProfile::fromLiked(
        collect([tasteEntry([1.0, 0.0, 0.0], FIVE_STAR_WEIGHT), tasteEntry([0.0, 1.0], FOUR_STAR_WEIGHT)]),
        configuredEmbeddingModel(),
    );

    expect($profile->similarityTo([0.0, 1.0]))->toBe(FOUR_STAR_WEIGHT);
});

test('scores zero when no liked vector has the candidate vector size', function () {
    $profile = TasteProfile::fromLiked(
        collect([tasteEntry([1.0, 0.0, 0.0], FIVE_STAR_WEIGHT)]),
        configuredEmbeddingModel(),
    );

    expect($profile->similarityTo([1.0, 0.0]))->toBe(0.0)
        ->and($profile->similarityTo([]))->toBe(0.0);
});
