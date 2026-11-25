<?php

use App\Services\Ai\Vector;

const FLOAT_TOLERANCE = 1e-6;

test('unpacking a packed vector returns it within float32 precision', function () {
    $vector = [0.1, -2.5, 3.14159, 0.0];

    expect(Vector::unpack(Vector::pack($vector)))->toEqualWithDelta($vector, FLOAT_TOLERANCE);
});

test('packing stores 4 bytes per value', function () {
    expect(strlen(Vector::pack([1.0, 2.0, 3.0])))->toBe(12);
});

test('cosine similarity of a vector with itself is 1', function () {
    expect(Vector::cosineSimilarity([1.0, 2.0, 3.0], [1.0, 2.0, 3.0]))->toEqualWithDelta(1.0, FLOAT_TOLERANCE);
});

test('cosine similarity of orthogonal vectors is 0', function () {
    expect(Vector::cosineSimilarity([1.0, 0.0], [0.0, 1.0]))->toEqualWithDelta(0.0, FLOAT_TOLERANCE);
});

test('cosine similarity of opposite vectors is -1', function () {
    expect(Vector::cosineSimilarity([1.0, 2.0], [-1.0, -2.0]))->toEqualWithDelta(-1.0, FLOAT_TOLERANCE);
});

test('cosine similarity ignores the scale of the vectors', function () {
    expect(Vector::cosineSimilarity([1.0, 2.0], [10.0, 20.0]))->toEqualWithDelta(1.0, FLOAT_TOLERANCE);
});

test('cosine similarity with a zero vector is 0', function () {
    expect(Vector::cosineSimilarity([0.0, 0.0], [1.0, 2.0]))->toBe(0.0);
});

test('cosine similarity rejects vectors of different lengths', function () {
    Vector::cosineSimilarity([1.0, 2.0], [1.0, 2.0, 3.0]);
})->throws(InvalidArgumentException::class);

test('cosine similarity rejects empty vectors', function () {
    Vector::cosineSimilarity([], []);
})->throws(InvalidArgumentException::class);
