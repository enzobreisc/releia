<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Enums\RecommendationStatus;
use App\Models\Book;
use App\Models\Recommendation;
use App\Services\Ai\BookEmbeddingIndexer;
use App\Services\Ai\EmbeddingUnavailable;
use App\Services\BookLookup\BookCandidate;
use App\Services\Recommendation\EmbeddingRanker;
use App\Services\Recommendation\LibraryIntake;
use App\Services\Recommendation\SourceBooks;
use App\Services\Recommendation\SuggestionGenerator;
use App\Services\Recommendation\TodaySuggestion;
use App\Services\Recommendation\WorkEditions;
use App\Services\Recommendation\WorkSearch;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Facades\Log;

/**
 * Suggests books you have not read yet: from the books rated 4 or 5, finds others by the
 * same author and on the same subject in Open Library.
 *
 * When to generate: only when the user asks (the "Find new suggestions" button or
 * `php artisan releia:suggestions`). There is no queue or cron, because the app is local.
 * Opening the screen and today() never touch the network.
 *
 * Only Brazilian editions are suggested (ISBN 978-85/65), and the Portuguese title comes from the
 * edition found by ISBN. A candidate pointed to by several of your books rises in the list, and
 * popularity on Open Library separates the well-known from the obscure. With Ollama enabled, the
 * candidates are also ordered by how close they are to the books you liked.
 *
 * Limits: at most six source books per search, with two Open Library searches each (by author and
 * by subject), each with an 8s timeout. A search stops after 20s and keeps what it found. Each query
 * is cached for 7 days; empty or failed responses are not stored, so they can be retried later.
 */
class RecommendationService
{
    private const INDEXING_BUDGET_SECONDS = 5;

    public function __construct(
        private readonly SourceBooks $sources,
        private readonly SuggestionGenerator $generator,
        private readonly TodaySuggestion $today,
        private readonly WorkSearch $workSearch,
        private readonly WorkEditions $workEditions,
        private readonly LibraryIntake $intake,
        private readonly BookEmbeddingIndexer $embeddingIndexer,
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
        if (EmbeddingRanker::isEnabled()) {
            $this->indexLikedBookEmbeddings();
        }

        return $this->generator->generate();
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

    /**
     * Indexing happens before the search so the search keeps its full budget, and it is capped
     * so the request cannot hang. Without Ollama, the search still runs and orders by score.
     */
    private function indexLikedBookEmbeddings(): void
    {
        $deadline = microtime(true) + self::INDEXING_BUDGET_SECONDS;
        $likedBooks = new EloquentCollection(
            $this->sources->liked()->map(fn (array $entry): Book => $entry[0])->all(),
        );

        try {
            $this->embeddingIndexer->index($likedBooks, $deadline);
        } catch (EmbeddingUnavailable $exception) {
            Log::warning('Embedding indexing unavailable, ordering by score', ['error' => $exception->getMessage()]);
        }
    }
}
