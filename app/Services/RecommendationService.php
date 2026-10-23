<?php

namespace App\Services;

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Enums\RecommendationStatus;
use App\Models\Author;
use App\Models\Book;
use App\Models\Reading;
use App\Models\Recommendation;
use App\Models\Setting;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\BrasilApiProvider;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Services\Recommendation\CandidateRanker;
use App\Services\Recommendation\GenericSubjects;
use App\Services\Recommendation\ScoredRanker;
use App\Services\Recommendation\Suggestion;
use App\Support\BookIdentity;
use App\Support\Genres;
use App\Support\Isbn;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Suggestion layer 1: from the books rated 4 or 5, finds others by the
 * same author and on the same subject in Open Library.
 *
 * When to generate: only when the user asks (the "Find new suggestions" button or
 * `php artisan releia:suggestions`). There is no queue or cron, because the app is local.
 * Opening the screen and today() never touch the network.
 *
 * Only works with a Brazilian edition count (ISBN 978-85/65, confirmed by ISBN to bring
 * the Portuguese title). The same candidate pointed to by several of your books rises in the list,
 * and popularity on Open Library separates the well-known from the obscure.
 *
 * Limits: at most MAX_SOURCES books per search (at most two calls per book,
 * with a 10s timeout each). Each query is cached for 7 days; empty or
 * failed responses are not stored, so they can be retried later.
 */
class RecommendationService
{
    /** How many rated books become sources in one search. */
    private const MAX_SOURCES = 6;

    /** Maximum time of one search, in seconds: past that, it keeps what it already found. */
    private const BUDGET_SECONDS = 20;

    /** How many new suggestions a search adds. */
    private const MAX_NEW = 20;

    private const CACHE_DAYS = 7;

    private const FIVE_STAR_WEIGHT = 1.0;

    private const FOUR_STAR_WEIGHT = 0.7;

    /** Want-to-read + 5 × ratings on Open Library: below this, a little-known work. */
    private const MIN_SUBJECT_POPULARITY = 40;

    private const TODAY_KEY = 'suggestion-of-day';

    /** How many searches have been made: on each one, Open Library is read on a different page. */
    private const ROUND_KEY = 'suggestion-round';

    /** How many pages of results per subject alternate before starting over. */
    private const PAGES = 3;

    /** Pending suggestions kept: above this the oldest ones drop out. */
    private const MAX_PENDING = 60;

    /** Open Library page of this search. */
    private int $page = 1;

    public function __construct(
        private readonly OpenLibraryProvider $openLibrary,
        private readonly BrasilApiProvider $brasilApi,
        private readonly BookLookupService $lookup,
        private readonly LibraryService $library,
        private readonly CandidateRanker $ranker = new ScoredRanker,
    ) {}

    /** Are there books rated 4 or 5 to generate suggestions from? */
    public function hasSources(): bool
    {
        return $this->sourceReadings()->exists();
    }

    /**
     * Finds new suggestions and returns how many were created, adding to the pending ones.
     * Each search re-draws the source books and reads another Open Library page,
     * so it does not always return the same ones.
     */
    public function generate(): int
    {
        $deadline = microtime(true) + self::BUDGET_SECONDS;
        $round = (int) Setting::get(self::ROUND_KEY, 0);
        $this->page = $round % self::PAGES + 1;
        $blocked = $this->blockedKeys();
        /** @var array<int, Suggestion> $found */
        $found = [];
        /** @var array<string, int> $index identity key → position in $found */
        $index = [];

        foreach ($this->sourceBooks() as [$book, $weight]) {
            // Searches go over the network: on timeout, it carries on with what already came (at least one book).
            if ($found !== [] && microtime(true) > $deadline) {
                break;
            }

            foreach ($this->candidatesFor($book) as $suggestion) {
                $keys = $this->keysOf($suggestion->candidate);

                if (array_intersect_key(array_flip($keys), $blocked) !== []) {
                    continue;
                }

                $position = null;

                foreach ($keys as $key) {
                    $position ??= $index[$key] ?? null;
                }

                $current = $position === null ? null : $found[$position];

                if ($current === null || ($current->kind === Suggestion::BY_SUBJECT && $suggestion->kind === Suggestion::BY_AUTHOR)) {
                    // New, or the same author replaces a subject-only reason: the stronger reason wins.
                    $position ??= count($found);
                    $found[$position] = new Suggestion($suggestion->candidate, $suggestion->reason, $book, $suggestion->kind, $weight);
                } elseif ($current->kind === $suggestion->kind && ! in_array($book->id, array_map(fn (Book $b) => $b->id, [$current->basedOn, ...$current->also]), true)) {
                    $found[$position] = $current->withSource($book, $weight);
                }

                foreach ($keys as $key) {
                    $index[$key] = $position;
                }
            }
        }

        $created = [];

        foreach ($this->ranker->rank(array_values($found)) as $attempt => $suggestion) {
            if (count($created) >= self::MAX_NEW || $attempt >= self::MAX_NEW * 2 || microtime(true) > $deadline) {
                break;
            }

            $verified = $this->inPortuguese($suggestion);

            if ($verified === null) {
                continue;
            }

            $keys = $this->keysOf($verified->candidate);

            // The Portuguese title may be a book you already have under another ISBN.
            if (array_intersect_key(array_flip($keys), $blocked) !== []) {
                continue;
            }

            foreach ($keys as $key) {
                $blocked[$key] = true;
            }

            $created[] = $verified;
        }

        // Nothing new on this page: the next search already reads another.
        if ($created === []) {
            Setting::put(self::ROUND_KEY, $round + 1);

            return 0;
        }

        foreach ($created as $suggestion) {
            Recommendation::create([
                'title' => $suggestion->candidate->title,
                'author' => $suggestion->candidate->authors === [] ? null : implode(', ', $suggestion->candidate->authors),
                'isbn_13' => $suggestion->candidate->isbn13,
                'cover_url' => $suggestion->candidate->coverUrl,
                'work_key' => $suggestion->candidate->workKey,
                'reason' => $suggestion->reason,
                'based_on_book_id' => $suggestion->basedOn->id,
                'status' => RecommendationStatus::New,
            ]);
        }

        Setting::put(self::ROUND_KEY, $round + 1);
        $this->trimPending();

        return count($created);
    }

    /** Keeps only the most recent pending ones. */
    private function trimPending(): void
    {
        $keep = Recommendation::query()->where('status', RecommendationStatus::New)->latest('id')->limit(self::MAX_PENDING)->pluck('id');

        Recommendation::query()->where('status', RecommendationStatus::New)->whereNotIn('id', $keep)->delete();
    }

    /**
     * The Open Library work comes with the original title ("The Hobbit"). The Brazilian edition,
     * fetched by ISBN, brings the title, authors and cover in Portuguese; without it, it does not suggest.
     */
    private function inPortuguese(Suggestion $suggestion): ?Suggestion
    {
        $isbn = $suggestion->candidate->isbn13;

        if ($isbn === null) {
            return null;
        }

        $edition = $this->brazilianEdition($isbn);

        if ($edition === null || $edition->title === '') {
            return null;
        }

        $candidate = $edition->fillFrom($suggestion->candidate);

        // Author and title come from the edition; the work's cover is only a fallback.
        return $suggestion->withCandidate($candidate, $this->reasonFor($suggestion));
    }

    /**
     * Edition by Brazilian ISBN: BrasilAPI first (one call, right title) and, if it
     * does not know it, the other sources. Each ISBN is cached.
     */
    private function brazilianEdition(string $isbn): ?BookCandidate
    {
        $key = 'author-edition:'.$isbn;
        $cached = Cache::get($key);

        if ($cached !== null) {
            return BookCandidate::fromArray($cached);
        }

        $edition = $this->brasilApi->findByIsbn($isbn);

        if ($edition !== null) {
            Cache::put($key, $edition->toArray(), now()->addDays(30));

            return $edition;
        }

        return $this->lookup->findByIsbn($isbn);
    }

    /** "same author as A and B" / "shared subject: Fantasy, like A and B". Stored in the language it was generated in. */
    private function reasonFor(Suggestion $suggestion): string
    {
        $titles = array_map(fn (Book $book) => $book->title, [$suggestion->basedOn, ...$suggestion->also]);
        $last = array_pop($titles);
        $list = $titles === [] ? $last : implode(', ', $titles).' '.__('e').' '.$last;

        return $suggestion->kind === Suggestion::BY_AUTHOR
            ? __('mesmo autor que :titles', ['titles' => $list])
            : __('assunto em comum: :genre, como :titles', ['genre' => __((string) $suggestion->basedOn->genre), 'titles' => $list]);
    }

    /**
     * Suggestion of the day: the same all day, even if the list changes. Does not hit the network.
     */
    public function today(): ?Recommendation
    {
        $today = Carbon::today()->toDateString();
        $saved = Setting::get(self::TODAY_KEY);

        $savedId = is_array($saved) && ($saved['date'] ?? null) === $today ? ($saved['id'] ?? null) : null;

        if (is_int($savedId)) {
            $pick = Recommendation::query()
                ->where('status', RecommendationStatus::New)
                ->find($savedId);

            if ($pick !== null) {
                return $pick;
            }
        }

        /** @var Collection<int, Recommendation> $options */
        $options = Recommendation::query()
            ->where('status', RecommendationStatus::New)
            ->orderBy('id')
            ->get();

        if ($options->isEmpty()) {
            return null;
        }

        // crc32 of the date: the choice changes from one day to the next, but not within the same day.
        $pick = $options->get(crc32($today) % $options->count());

        if ($pick !== null) {
            Setting::put(self::TODAY_KEY, ['date' => $today, 'id' => $pick->id]);
        }

        return $pick;
    }

    /**
     * Editions of the suggested work, Brazilian first, to pick which one to read.
     *
     * @return list<BookCandidate>
     */
    public function editions(Recommendation $recommendation): array
    {
        // Old suggestions did not store the work: find it by ISBN and store it for next time.
        if ($recommendation->work_key === null && $recommendation->isbn_13 !== null) {
            $key = $this->openLibrary->workKeyForIsbn($recommendation->isbn_13);

            if ($key !== null) {
                $recommendation->update(['work_key' => $key]);
            }
        }

        if ($recommendation->work_key === null) {
            return [];
        }

        return $this->lookup->editions($recommendation->work_key, $this->authorList($recommendation->author));
    }

    /**
     * "Want to read": creates the book on the "want to read" shelf and closes the suggestion.
     * With `$isbn`, it creates the chosen edition instead of the suggested one.
     */
    public function accept(Recommendation $recommendation, ?string $isbn = null): bool
    {
        $added = $this->addToLibrary($recommendation, ReadingStatus::WantToRead, $isbn);

        $recommendation->update(['status' => RecommendationStatus::WantToRead]);

        return $added;
    }

    /**
     * "Already read": creates the book as read. The suggestion is closed as dismissed, which is enough
     * to keep it from coming back (the book is now also in the collection).
     */
    public function alreadyRead(Recommendation $recommendation, ?string $isbn = null): bool
    {
        $added = $this->addToLibrary($recommendation, ReadingStatus::Read, $isbn);

        $recommendation->update(['status' => RecommendationStatus::Dismissed]);

        return $added;
    }

    /** "Not interested": never suggest this book again. */
    public function dismiss(Recommendation $recommendation): void
    {
        $recommendation->update(['status' => RecommendationStatus::Dismissed]);
    }

    /**
     * The candidates of a source book, each with its reason.
     *
     * @return list<Suggestion>
     */
    private function candidatesFor(Book $book): array
    {
        $suggestions = [];

        $author = $book->authors->first()?->name;

        if ($author !== null) {
            $candidates = $this->cachedCandidates(
                'author:'.BookIdentity::normalize($author),
                fn () => $this->openLibrary->searchByAuthor($author),
            );

            foreach ($candidates as $candidate) {
                // The author search also returns works by co-authors and namesakes: only valid if the author is on the work.
                if (! $this->isUsable($candidate) || ! $this->isBy($candidate, $author)) {
                    continue;
                }

                $suggestions[] = new Suggestion($candidate, __('mesmo autor que :titles', ['titles' => $book->title]), $book, Suggestion::BY_AUTHOR);
            }
        }

        // The catalog genres are in Portuguese; Open Library indexes subjects in English.
        $subject = Genres::openLibrarySubject($book->genre) ?? $book->genre;

        if (GenericSubjects::isUseful($subject) && $subject !== null) {
            $candidates = $this->cachedCandidates(
                'subject:'.BookIdentity::normalize($subject).':p'.$this->page,
                fn () => $this->openLibrary->searchBySubject($subject, $this->page),
            );

            foreach ($candidates as $candidate) {
                if ($this->isUsable($candidate) && $this->fitsSubject($candidate, $book)) {
                    $suggestions[] = new Suggestion($candidate, __('assunto em comum: :genre', ['genre' => __((string) $book->genre)]), $book, Suggestion::BY_SUBJECT);
                }
            }
        }

        return $suggestions;
    }

    /**
     * Books rated 4 or 5 on each book's most recent reading (rereads:
     * the latest pass counts, not the first).
     *
     * @return Builder<Reading>
     */
    private function sourceReadings(): Builder
    {
        return Reading::query()
            ->whereIn('id', Reading::query()->selectRaw('max(id)')->groupBy('book_id'))
            ->whereIn('rating', [4, 5]);
    }

    /**
     * Source books with the rating's weight: 5 stars count more than 4.
     *
     * @return Collection<int, array{0: Book, 1: float}>
     */
    private function sourceBooks(): Collection
    {
        return $this->sourceReadings()
            ->with('book.authors')
            ->inRandomOrder()
            ->limit(self::MAX_SOURCES)
            ->get()
            ->map(fn (Reading $reading) => [$reading->book, self::ratingWeight($reading)]);
    }

    private static function ratingWeight(Reading $reading): float
    {
        return $reading->rating === 5 ? self::FIVE_STAR_WEIGHT : self::FOUR_STAR_WEIGHT;
    }

    /**
     * A Brazilian edition to search in Portuguese, and a title that is not just an author's name.
     * Subject search brings everything: it requires the same genre (or no known genre on the
     * source book), a cover and some popularity, so it does not suggest an obscure work.
     */
    private function isUsable(BookCandidate $candidate): bool
    {
        if ($candidate->isbn13 === null || ! Isbn::isBrazilian($candidate->isbn13)) {
            return false;
        }

        $title = BookIdentity::normalizeTitle($candidate->title);

        if ($title === '') {
            return false;
        }

        return ! in_array($title, array_map(BookIdentity::normalize(...), $candidate->authors), true);
    }

    private function fitsSubject(BookCandidate $candidate, Book $book): bool
    {
        if ($candidate->coverUrl === null || ($candidate->popularity ?? 0) < self::MIN_SUBJECT_POPULARITY) {
            return false;
        }

        // Without a known genre on the work there is no telling whether it is similar.
        return $candidate->genre !== null && $candidate->genre === $book->genre;
    }

    private function isBy(BookCandidate $candidate, string $author): bool
    {
        return in_array(
            BookIdentity::normalize($author),
            array_map(BookIdentity::normalize(...), $candidate->authors),
            true,
        );
    }

    /**
     * Caches the API response, but never an empty list (it may be a network error).
     *
     * @param  Closure(): list<BookCandidate>  $fetch
     * @return list<BookCandidate>
     */
    private function cachedCandidates(string $key, Closure $fetch): array
    {
        $key = 'suggestions:v2:'.$key;

        if (Cache::has($key)) {
            return array_values(array_map(BookCandidate::fromArray(...), Cache::get($key)));
        }

        $candidates = $fetch();

        if ($candidates !== []) {
            Cache::put($key, array_map(fn (BookCandidate $c) => $c->toArray(), $candidates), now()->addDays(self::CACHE_DAYS));
        }

        return $candidates;
    }

    /**
     * Keys of everything that must not come back as a suggestion: the collection, suggestions already made
     * (pending and dismissed) and the shopping list.
     *
     * @return array<string, true>
     */
    private function blockedKeys(): array
    {
        $keys = [];

        foreach ([...$this->libraryKeys(), ...$this->recommendationKeys(), ...$this->shoppingKeys()] as $key) {
            $keys[$key] = true;
        }

        return $keys;
    }

    /** @return list<string> */
    private function libraryKeys(): array
    {
        return array_values(Book::query()->with('authors')->get()
            ->flatMap(fn (Book $book) => BookIdentity::keys(
                $book->title,
                array_values($book->authors->map(fn (Author $author) => $author->name)->all()),
                $book->isbn_13,
                $book->isbn_10,
            ))
            ->all());
    }

    /** @return list<string> */
    private function recommendationKeys(): array
    {
        return array_values(Recommendation::query()->get()
            ->flatMap(fn (Recommendation $recommendation) => BookIdentity::keys(
                $recommendation->title,
                $this->authorList($recommendation->author),
                $recommendation->isbn_13,
            ))
            ->all());
    }

    /**
     * Shopping list. Tolerant of a missing table or columns.
     * The queue (queue_items) does not count: it only holds books already in the collection.
     *
     * @return list<string>
     */
    private function shoppingKeys(): array
    {
        if (! Schema::hasTable('shopping_items')) {
            return [];
        }

        $columns = array_values(array_intersect(['title', 'author', 'isbn'], Schema::getColumnListing('shopping_items')));

        if (! in_array('title', $columns, true)) {
            return [];
        }

        $keys = [];

        foreach (DB::table('shopping_items')->get($columns) as $item) {
            $title = (string) $item->title;
            $author = isset($item->author) ? (string) $item->author : null;
            $isbn = isset($item->isbn) ? (string) $item->isbn : null;

            $keys = [...$keys, ...BookIdentity::keys($title, $this->authorList($author), $isbn !== null ? Isbn::toIsbn13($isbn) : null)];
        }

        return $keys;
    }

    /**
     * Keys of a candidate, to compare with the collection and the suggestions.
     *
     * @return list<string>
     */
    private function keysOf(BookCandidate $candidate): array
    {
        return BookIdentity::keys($candidate->title, $candidate->authors, $candidate->isbn13, $candidate->isbn10);
    }

    /**
     * Creates the book in the library, with full metadata when there is an ISBN.
     * If the book is already in the collection, it does not create it again (the ISBN is unique).
     */
    private function addToLibrary(Recommendation $recommendation, ReadingStatus $status, ?string $isbn = null): bool
    {
        if (array_intersect($this->keysOfRecommendation($recommendation), $this->libraryKeys()) !== []) {
            return false;
        }

        // Chosen edition: its ISBN counts, not the suggestion's.
        $isbn = $isbn !== null ? Isbn::toIsbn13($isbn) : null;

        if ($isbn !== null) {
            if (Book::query()->where('isbn_13', $isbn)->exists()) {
                return false;
            }

            $recommendation->isbn_13 = $isbn;
        }

        $candidate = $recommendation->isbn_13 !== null ? $this->lookup->findByIsbn($recommendation->isbn_13) : null;

        $data = $candidate?->toArray() ?? [
            'title' => $recommendation->title,
            'subtitle' => null,
            'authors' => $this->authorList($recommendation->author),
            'isbn_13' => $recommendation->isbn_13,
            'isbn_10' => $recommendation->isbn_13 !== null ? Isbn::toIsbn10($recommendation->isbn_13) : null,
            'publisher' => null,
            'published_year' => null,
            'pages' => null,
            'genre' => null,
            'description' => null,
            'cover_url' => null,
            'source' => BookSource::OpenLibrary->value,
        ];

        $data['cover_url'] ??= $recommendation->cover_url;
        $data['status'] = $status->value;

        $this->library->add($data);

        return true;
    }

    /** @return list<string> */
    private function keysOfRecommendation(Recommendation $recommendation): array
    {
        return BookIdentity::keys(
            $recommendation->title,
            $this->authorList($recommendation->author),
            $recommendation->isbn_13,
        );
    }

    /**
     * Authors stored as "A, B" turn back into a list.
     *
     * @return list<string>
     */
    private function authorList(?string $author): array
    {
        return $author === null || trim($author) === '' ? [] : array_map(trim(...), explode(',', $author));
    }
}
