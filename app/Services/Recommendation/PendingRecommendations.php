<?php

namespace App\Services\Recommendation;

use App\Enums\RecommendationStatus;
use App\Models\Recommendation;

final class PendingRecommendations
{
    /** Pending suggestions kept: above this the oldest ones expire. */
    private const MAX_PENDING = 60;

    /**
     * @param  list<Suggestion>  $suggestions
     * @return list<int> the ids of the created suggestions
     */
    public function store(array $suggestions): array
    {
        $ids = [];

        foreach ($suggestions as $suggestion) {
            // Want-to-read books leave the library when they move to the shopping list, and deleting
            // a book deletes the suggestions based on it, so only a rated book is kept as the basis.
            $basedOnBookId = $suggestion->basedOn->origin === SourceOrigin::Rated ? $suggestion->basedOn->book?->id : null;

            $ids[] = Recommendation::create([
                'title' => $suggestion->candidate->title,
                'author' => $suggestion->candidate->authors === [] ? null : implode(', ', $suggestion->candidate->authors),
                'isbn_13' => $suggestion->candidate->isbn13,
                'cover_url' => $suggestion->candidate->coverUrl,
                'work_key' => $suggestion->candidate->workKey,
                'reason' => $suggestion->reason,
                'based_on_book_id' => $basedOnBookId,
                'status' => RecommendationStatus::New,
            ])->id;
        }

        return $ids;
    }

    /**
     * Pending suggestions by a requested author, newest first. Without page counts they cannot be checked
     * against a page limit, so a request with one leaves them out.
     *
     * @return list<int>
     */
    public function matchingIds(SearchScope $scope): array
    {
        if (! $scope->hasAuthors() || $scope->hasPageLimit()) {
            return [];
        }

        $matching = Recommendation::query()
            ->where('status', RecommendationStatus::New)
            ->latest('id')
            ->get()
            ->filter(fn (Recommendation $recommendation): bool => $this->isByRequestedAuthor($recommendation, $scope))
            ->take(SearchScope::MAX_RESULTS);

        return array_values($matching->map(fn (Recommendation $recommendation): int => $recommendation->id)->all());
    }

    /** @param  list<int>  $protected  ids that stay pending even when they are older than the newest ones */
    public function expireOverflow(array $protected = []): void
    {
        $keep = Recommendation::query()->where('status', RecommendationStatus::New)->latest('id')->limit(self::MAX_PENDING)->pluck('id');

        Recommendation::query()
            ->where('status', RecommendationStatus::New)
            ->whereNotIn('id', [...$keep, ...$protected])
            ->update(['status' => RecommendationStatus::Expired]);
    }

    private function isByRequestedAuthor(Recommendation $recommendation, SearchScope $scope): bool
    {
        $names = AuthorNames::split($recommendation->author);

        if ($scope->excludesAny($names)) {
            return false;
        }

        return array_any($names, fn (string $name): bool => array_any(
            $scope->authors,
            fn (RequestedAuthor $author): bool => AuthorNameMatch::matches($author->name, $name),
        ));
    }
}
