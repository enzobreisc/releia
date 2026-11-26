<?php

namespace App\Services\Recommendation;

use App\Models\BookEmbedding;
use App\Models\Reading;
use App\Services\Ai\SimilarityScale;
use App\Services\Ai\Vector;
use Illuminate\Support\Collection;

/**
 * The books that shape your taste (rated 2 to 5), as embedding vectors weighted by their current rating.
 * Dismissed suggestions are not a negative signal: "already read" also marks them dismissed, and
 * candidates have no stored vectors to weigh against.
 */
final readonly class TasteProfile
{
    /** Similarity weight by the book's current rating; 1 stars and unrated books do not shape the profile. */
    private const WEIGHTS_BY_RATING = [5 => 1.0, 4 => 0.6, 3 => 0.3, 2 => 0.1];

    /**
     * @param  list<array{0: list<float>, 1: float}>  $weightedVectors  each vector with its rating weight
     */
    private function __construct(
        private array $weightedVectors,
        private SimilarityScale $scale,
    ) {}

    /**
     * @return list<int>
     */
    public static function shapingRatings(): array
    {
        return array_keys(self::WEIGHTS_BY_RATING);
    }

    /**
     * @param  Collection<int, Reading>  $readings
     */
    public static function fromReadings(Collection $readings, string $model, SimilarityScale $scale): self
    {
        $embeddingsByBookId = BookEmbedding::query()
            ->where('model', $model)
            ->whereIn('book_id', $readings->pluck('book_id'))
            ->get()
            ->keyBy('book_id');

        $weightedVectors = [];

        foreach ($readings as $reading) {
            $embedding = $embeddingsByBookId->get($reading->book_id);
            $weight = self::WEIGHTS_BY_RATING[$reading->rating] ?? null;

            if ($embedding !== null && $weight !== null) {
                $weightedVectors[] = [$embedding->vector, $weight];
            }
        }

        return new self($weightedVectors, $scale);
    }

    public function isEmpty(): bool
    {
        return $this->weightedVectors === [];
    }

    /**
     * Takes the closest book rather than the average: averaging varied books
     * would score every candidate about the same.
     *
     * @param  list<float>  $vector
     */
    public function similarityTo(array $vector): float
    {
        $similarities = [];

        foreach ($this->weightedVectors as [$bookVector, $weight]) {
            if ($vector !== [] && count($bookVector) === count($vector)) {
                $similarities[] = $this->scale->normalize(Vector::cosineSimilarity($vector, $bookVector)) * $weight;
            }
        }

        return $similarities === [] ? 0.0 : max($similarities);
    }
}
