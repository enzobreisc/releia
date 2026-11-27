<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Enums\RecommendationStatus;
use App\Models\Recommendation;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryAvailability;
use App\Services\Recommendation\LibraryIntake;
use App\Services\Recommendation\SearchBudget;
use App\Services\Recommendation\SourceBooks;
use App\Services\Recommendation\SuggestionGenerator;
use App\Services\Recommendation\TodaySuggestion;
use App\Services\Recommendation\WorkEditions;
use App\Services\Recommendation\WorkSearch;

/**
 * Suggests books you have not read yet: other works, in Open Library, by the authors of the books rated
 * 4 or 5, of the books on "Quero ler" and of the unbought shopping list.
 *
 * When to generate: only when the user asks (the "Find new suggestions" button or
 * `php artisan releia:suggestions`). There is no queue or cron, because the app is local.
 * Opening the screen and today() never touch the network.
 *
 * Only Brazilian editions are suggested (ISBN 978-85/65), and the Portuguese title comes from the
 * edition found by ISBN. A candidate pointed to by several of your books rises in the list, and
 * popularity on Open Library separates the well-known from the obscure.
 *
 * Limits: at most six sources per search, two of them reserved for "Quero ler" and shopping list books
 * when there are any. Each source costs one Open Library author search,
 * with an 8s timeout. A search stops after 20s and keeps what it found, and at most three works by the
 * same author are suggested per search. Each query is cached for 7 days; empty or failed responses are
 * not stored, so they can be retried later.
 */
class RecommendationService
{
    public function __construct(
        private readonly SourceBooks $sources,
        private readonly OpenLibraryAvailability $availability,
        private readonly SuggestionGenerator $generator,
        private readonly TodaySuggestion $today,
        private readonly WorkSearch $workSearch,
        private readonly WorkEditions $workEditions,
        private readonly LibraryIntake $intake,
    ) {}

    public function hasSources(): bool
    {
        return $this->sources->exist();
    }

    /**
     * Finds new suggestions and returns how many were created, adding to the pending ones.
     */
    public function generate(): int
    {
        SearchBudget::extendRequestLimit();

        return $this->generator->generate();
    }

    public function isSearchSourceUnavailable(): bool
    {
        return $this->availability->isUnavailable();
    }

    public function today(): ?Recommendation
    {
        return $this->today->pick();
    }

    /**
     * @return list<BookCandidate>
     */
    public function search(string $text): array
    {
        return $this->workSearch->search($text);
    }

    /**
     * Editions of the suggested work, Brazilian first, to pick which one to read.
     *
     * @return list<BookCandidate>
     */
    public function editions(Recommendation $recommendation): array
    {
        SearchBudget::extendRequestLimit();

        return $this->workEditions->for($recommendation);
    }

    /**
     * "Want to read": creates the book on the "want to read" shelf and closes the suggestion.
     * With `$isbn`, it creates the chosen edition instead of the suggested one.
     */
    public function accept(Recommendation $recommendation, ?string $isbn = null): bool
    {
        $added = $this->intake->add($recommendation, ReadingStatus::WantToRead, $isbn);

        $recommendation->update(['status' => RecommendationStatus::WantToRead]);

        return $added;
    }

    /**
     * "Already read": creates the book as read. The suggestion is closed as dismissed, which is enough
     * to keep it from coming back (the book is now also in the collection).
     */
    public function alreadyRead(Recommendation $recommendation, ?string $isbn = null): bool
    {
        $added = $this->intake->add($recommendation, ReadingStatus::Read, $isbn);

        $recommendation->update(['status' => RecommendationStatus::Dismissed]);

        return $added;
    }

    /** "Not interested": never suggest this book again. */
    public function dismiss(Recommendation $recommendation): void
    {
        $recommendation->update(['status' => RecommendationStatus::Dismissed]);
    }
}
