<?php

namespace App\Services\Recommendation;

use App\Models\Reading;
use Illuminate\Database\Eloquent\Collection;

/**
 * The readings that shape your taste: each book's latest reading, when its rating is one that
 * TasteProfile weighs. Used both to build the profile and to decide which books get embedded.
 * Heaviest ratings come first, so they are embedded first when the indexing time runs out.
 */
final class ProfileReadings
{
    /**
     * @return Collection<int, Reading>
     */
    public function get(): Collection
    {
        return Reading::query()
            ->current()
            ->whereIn('rating', TasteProfile::shapingRatings())
            ->orderByDesc('rating')
            ->orderByDesc('id')
            ->with('book.authors')
            ->get();
    }
}
