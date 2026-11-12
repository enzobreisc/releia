<?php

namespace App\Services\Recommendation;

use App\Models\Book;
use App\Models\Reading;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

final class SourceBooks
{
    private const MAX_SOURCES = 6;

    private const FIVE_STAR_WEIGHT = 1.0;

    private const FOUR_STAR_WEIGHT = 0.7;

    public function exist(): bool
    {
        return $this->readings()->exists();
    }

    /**
     * Source books with the rating's weight: 5 stars count more than 4.
     *
     * @return Collection<int, array{0: Book, 1: float}>
     */
    public function pick(): Collection
    {
        return $this->readings()
            ->with('book.authors')
            ->inRandomOrder()
            ->limit(self::MAX_SOURCES)
            ->get()
            ->map(fn (Reading $reading) => [$reading->book, self::ratingWeight($reading)]);
    }

    /**
     * Books rated 4 or 5 on each book's most recent reading (rereads:
     * the latest pass counts, not the first).
     *
     * @return Builder<Reading>
     */
    private function readings(): Builder
    {
        return Reading::query()
            ->current()
            ->whereIn('rating', [4, 5]);
    }

    private static function ratingWeight(Reading $reading): float
    {
        return $reading->rating === 5 ? self::FIVE_STAR_WEIGHT : self::FOUR_STAR_WEIGHT;
    }
}
