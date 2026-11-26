<?php

namespace App\Services\Recommendation;

use App\Enums\RecommendationStatus;
use App\Models\Recommendation;

final class PendingRecommendations
{
    /** Pending suggestions kept: above this the oldest ones drop out. */
    private const MAX_PENDING = 60;

    /**
     * @param  list<Suggestion>  $suggestions
     */
    public function store(array $suggestions): void
    {
        foreach ($suggestions as $suggestion) {
            // Want-to-read books leave the library when they move to the shopping list, and deleting
            // a book deletes the suggestions based on it, so only a rated book is kept as the basis.
            $basedOnBookId = $suggestion->basedOn->origin === SourceOrigin::Rated ? $suggestion->basedOn->book?->id : null;

            Recommendation::create([
                'title' => $suggestion->candidate->title,
                'author' => $suggestion->candidate->authors === [] ? null : implode(', ', $suggestion->candidate->authors),
                'isbn_13' => $suggestion->candidate->isbn13,
                'cover_url' => $suggestion->candidate->coverUrl,
                'work_key' => $suggestion->candidate->workKey,
                'reason' => $suggestion->reason,
                'based_on_book_id' => $basedOnBookId,
                'status' => RecommendationStatus::New,
            ]);
        }
    }

    public function trim(): void
    {
        $keep = Recommendation::query()->where('status', RecommendationStatus::New)->latest('id')->limit(self::MAX_PENDING)->pluck('id');

        Recommendation::query()->where('status', RecommendationStatus::New)->whereNotIn('id', $keep)->delete();
    }
}
