<?php

use App\Enums\BookSource;
use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\BookEmbedding;
use App\Services\Ai\EmbeddingText;
use App\Services\BookLookup\BookCandidate;
use App\Services\Recommendation\EmbeddingRanker;
use App\Services\Recommendation\SearchBudget;
use App\Services\Recommendation\Source;
use App\Services\Recommendation\Suggestion;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

const CLOSE_TITLE = 'Perto';

const FAR_TITLE = 'Longe';

beforeEach(fn () => mt_srand(1));

/**
 * Candidates whose text mentions "Perto" get the vector of the profile book; the others point the opposite way.
 */
function nearAndFarVector(string $input): array
{
    return str_contains($input, CLOSE_TITLE) ? [1.0, 0.0] : [0.0, 1.0];
}

function profileBook(int $rating = 5): Book
{
    $book = Book::factory()->create();
    $book->readings()->create(['status' => ReadingStatus::Read, 'rating' => $rating]);

    BookEmbedding::query()->create([
        'book_id' => $book->id,
        'model' => configuredEmbeddingModel(),
        'vector' => [1.0, 0.0],
        'source_hash' => 'hash',
    ]);

    return $book;
}

function rankerSuggestion(string $title, Book $basedOn): Suggestion
{
    return new Suggestion(
        new BookCandidate(title: $title, source: BookSource::OpenLibrary, authors: ['Autor'], genre: 'Romance'),
        'mesmo autor',
        Source::rated($basedOn, 1.0),
    );
}

/**
 * @param  list<Suggestion>  $suggestions
 * @return list<string>
 */
function titlesOf(array $suggestions): array
{
    return array_map(fn (Suggestion $suggestion): string => $suggestion->candidate->title, $suggestions);
}

test('the candidate closer to a profile book comes first when the scores are equal', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    $source = profileBook();

    $ranked = app(EmbeddingRanker::class)->rank(
        [rankerSuggestion(FAR_TITLE, $source), rankerSuggestion(CLOSE_TITLE, $source)],
        SearchBudget::deadline(),
    );

    expect(titlesOf($ranked))->toBe([CLOSE_TITLE, FAR_TITLE]);
});

test('returns every suggestion exactly once, only reordered', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    $source = profileBook();
    $suggestions = [
        rankerSuggestion(FAR_TITLE, $source),
        rankerSuggestion(CLOSE_TITLE, $source),
        rankerSuggestion('Outro', $source),
    ];

    $ranked = app(EmbeddingRanker::class)->rank($suggestions, SearchBudget::deadline());

    expect(titlesOf($ranked))->toEqualCanonicalizing(titlesOf($suggestions));
});

test('keeps every suggestion and logs a warning when Ollama fails', function () {
    Log::spy();
    fakeOllamaEmbeddings(status: 500);
    $source = profileBook();
    $suggestions = [rankerSuggestion(FAR_TITLE, $source), rankerSuggestion(CLOSE_TITLE, $source)];

    $ranked = app(EmbeddingRanker::class)->rank($suggestions, SearchBudget::deadline());

    expect(titlesOf($ranked))->toEqualCanonicalizing(titlesOf($suggestions));
    Log::shouldHaveReceived('warning')->once();
});

test('does not call Ollama when no profile book has a vector', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    $source = ratedBook('Sem vetor', 'Autor', 5);

    app(EmbeddingRanker::class)->rank([rankerSuggestion(CLOSE_TITLE, $source)], SearchBudget::deadline());

    Http::assertNothingSent();
});

test('does not call Ollama again for candidates whose vectors are cached', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    $source = profileBook();
    $suggestions = [rankerSuggestion(CLOSE_TITLE, $source), rankerSuggestion(FAR_TITLE, $source)];

    app(EmbeddingRanker::class)->rank($suggestions, SearchBudget::deadline());
    app(EmbeddingRanker::class)->rank($suggestions, SearchBudget::deadline());

    Http::assertSentCount(1);
});

test('sends only the candidates that are not cached yet', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    $source = profileBook();
    $cached = rankerSuggestion(CLOSE_TITLE, $source);
    $missing = rankerSuggestion(FAR_TITLE, $source);

    app(EmbeddingRanker::class)->rank([$cached], SearchBudget::deadline());
    app(EmbeddingRanker::class)->rank([$cached, $missing], SearchBudget::deadline());

    Http::assertSentCount(2);
    Http::assertSent(fn (Request $request): bool => $request['input'] === [
        config()->string('services.ollama.embedding_prefix').EmbeddingText::forCandidate($missing->candidate),
    ]);
});

test('sends an identical candidate text only once and still ranks both', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    $source = profileBook();
    $suggestions = [rankerSuggestion(CLOSE_TITLE, $source), rankerSuggestion(CLOSE_TITLE, $source)];

    $ranked = app(EmbeddingRanker::class)->rank($suggestions, SearchBudget::deadline());

    Http::assertSent(fn (Request $request): bool => count($request['input']) === 1);
    expect($ranked)->toHaveCount(2);
});

test('a candidate matching only a 2-star book does not outrank a clearly higher-scored candidate', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    $source = profileBook(rating: 2);
    $suggest = fn (string $title, float $affinity): Suggestion => new Suggestion(
        new BookCandidate(title: $title, source: BookSource::OpenLibrary, authors: ['Autor'], genre: 'Romance'),
        'mesmo autor',
        Source::rated($source, 1.0),
        $affinity,
    );

    $ranked = app(EmbeddingRanker::class)->rank([
        $suggest('Outro', 1 / 3),
        $suggest(CLOSE_TITLE, 2 / 3),
        $suggest(FAR_TITLE, 1.0),
    ], SearchBudget::deadline());

    expect(titlesOf($ranked))->toBe([FAR_TITLE, CLOSE_TITLE, 'Outro']);
});

test('skips Ollama when the search deadline is too close', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    $source = profileBook();
    $suggestions = [rankerSuggestion(FAR_TITLE, $source), rankerSuggestion(CLOSE_TITLE, $source)];

    $ranked = app(EmbeddingRanker::class)->rank($suggestions, microtime(true) + 1);

    Http::assertNothingSent();
    expect(titlesOf($ranked))->toEqualCanonicalizing(titlesOf($suggestions));
});

test('skips Ollama when the configured timeout does not fit before the deadline', function () {
    fakeOllamaEmbeddings(vectorFor: nearAndFarVector(...));
    config()->set('services.ollama.timeout', 15);
    $source = profileBook();
    $suggestions = [rankerSuggestion(FAR_TITLE, $source), rankerSuggestion(CLOSE_TITLE, $source)];

    $ranked = app(EmbeddingRanker::class)->rank($suggestions, microtime(true) + 10);

    Http::assertNothingSent();
    expect(titlesOf($ranked))->toEqualCanonicalizing(titlesOf($suggestions));
});
