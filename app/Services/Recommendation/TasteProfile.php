<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Models\BookEmbedding;
use App\Services\Ai\Vector;
use Illuminate\Support\Collection;

/**
 * The books you rated 4 or 5, as embedding vectors. Dismissed suggestions are not a negative
 * signal: "already read" also marks them dismissed, and candidates have no stored vectors to weigh against.
 */
final readonly class TasteProfile
{
    /**
     * @param  list<array{0: list<float>, 1: float}>  $likedVectors  each vector with its rating weight
     */
    private function __construct(private array $likedVectors) {}

    /**
     * @param  Collection<int, array{0: Book, 1: float}>  $liked
     */
    public static function fromLiked(Collection $liked, string $model): self
    {
        $embeddingsByBookId = BookEmbedding::query()
            ->where('model', $model)
            ->whereIn('book_id', $liked->map(fn (array $entry): int => $entry[0]->id))
            ->get()
            ->keyBy('book_id');

        $likedVectors = [];

        foreach ($liked as [$book, $weight]) {
            $embedding = $embeddingsByBookId->get($book->id);

            if ($embedding !== null) {
                $likedVectors[] = [$embedding->vector, $weight];
            }
        }

        return new self($likedVectors);
    }

    public function isEmpty(): bool
    {
        return $this->likedVectors === [];
    }

    /**
     * Takes the closest liked book rather than the average: averaging varied books
     * would score every candidate about the same.
     *
     * @param  list<float>  $vector
     */
    public function similarityTo(array $vector): float
    {
        $similarities = [];

        foreach ($this->likedVectors as [$likedVector, $weight]) {
            if ($vector !== [] && count($likedVector) === count($vector)) {
                $similarities[] = Vector::cosineSimilarity($vector, $likedVector) * $weight;
            }
        }

        return $similarities === [] ? 0.0 : max($similarities);
    }
}
