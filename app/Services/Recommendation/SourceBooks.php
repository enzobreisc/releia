<?php

namespace App\Services\Recommendation;

use App\Models\Reading;
use Illuminate\Database\Eloquent\Builder;

/**
 * The titles a search starts from: books rated 4 or 5, and the books you want to read or plan to buy.
 */
final class SourceBooks
{
    public const FOUR_STAR_WEIGHT = 0.7;

    private const MAX_SOURCES = 6;

    /** Reserved for the interest sources when there are any, so rated books cannot take every slot. */
    private const INTEREST_SLOTS = 2;

    private const SOURCE_RATINGS = [4, 5];

    private const TOP_RATING = 5;

    private const FIVE_STAR_WEIGHT = 1.0;

    public function __construct(private readonly InterestSources $interest) {}

    public function exist(): bool
    {
        return $this->ratedReadings()->exists() || $this->interest->exist();
    }

    /**
     * Rated sources with the rating's weight (5 stars count more than 4), interleaved with the interest
     * sources. The collector stops at its deadline, so the sources at the end of the list may never be searched.
     *
     * @return list<Source>
     */
    public function pick(): array
    {
        $readings = $this->ratedReadings()->with('book.authors')->get();

        $rated = $readings
            ->shuffle()
            ->map(fn (Reading $reading): Source => Source::rated($reading->book, self::ratingWeight($reading)))
            ->values()
            ->all();

        // Only the first author of a rated book is searched, so only that one is left out, drawn or not.
        $ratedAuthorKeys = array_values(array_unique(array_filter(
            array_map(fn (Source $source): ?string => $source->authorKey(), $rated),
        )));

        $interest = $this->interest->pick($ratedAuthorKeys);
        $interestCount = min(count($interest), max(self::INTEREST_SLOTS, self::MAX_SOURCES - count($rated)));
        $ratedCount = min(count($rated), self::MAX_SOURCES - $interestCount);

        return self::interleave(array_slice($rated, 0, $ratedCount), array_slice($interest, 0, $interestCount));
    }

    /**
     * Books rated 4 or 5 on each book's most recent reading (rereads:
     * the latest pass counts, not the first).
     *
     * @return Builder<Reading>
     */
    private function ratedReadings(): Builder
    {
        return Reading::query()
            ->current()
            ->whereIn('rating', self::SOURCE_RATINGS);
    }

    /**
     * @param  list<Source>  $rated
     * @param  list<Source>  $interest
     * @return list<Source>
     */
    private static function interleave(array $rated, array $interest): array
    {
        $sources = [];

        for ($turn = 0; $turn < max(count($rated), count($interest)); $turn++) {
            if (isset($rated[$turn])) {
                $sources[] = $rated[$turn];
            }

            if (isset($interest[$turn])) {
                $sources[] = $interest[$turn];
            }
        }

        return $sources;
    }

    private static function ratingWeight(Reading $reading): float
    {
        return $reading->rating === self::TOP_RATING ? self::FIVE_STAR_WEIGHT : self::FOUR_STAR_WEIGHT;
    }
}
