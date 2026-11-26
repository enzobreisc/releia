<?php

use App\Models\Book;
use App\Models\BookEmbedding;
use App\Models\Recommendation;
use App\Models\Setting;
use App\Services\Ai\EmbeddingText;
use App\Services\Recommendation\CandidateRanker;
use App\Services\Recommendation\EmbeddingRanker;
use App\Services\Recommendation\ScoredRanker;
use App\Services\Recommendation\Suggestion;
use App\Services\RecommendationService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

test('the candidate ranker is the scored one while the setting is off', function () {
    expect(app(CandidateRanker::class))->toBeInstanceOf(ScoredRanker::class);
});

test('the candidate ranker is the embedding one once the setting is on', function () {
    Setting::put(EmbeddingRanker::SETTING, true);

    expect(app(CandidateRanker::class))->toBeInstanceOf(EmbeddingRanker::class);
});

test('the generated suggestions go through the bound candidate ranker', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');
    $ranker = new class implements CandidateRanker
    {
        /** @var list<Suggestion> */
        public array $received = [];

        public function rank(array $suggestions, float $deadline): array
        {
            $this->received = $suggestions;

            return $suggestions;
        }
    };
    app()->instance(CandidateRanker::class, $ranker);

    app(RecommendationService::class)->generate();

    expect($ranker->received)->not->toBeEmpty();
});

test('does not call Ollama while the setting is off', function () {
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');

    app(RecommendationService::class)->generate();

    Http::assertNotSent(fn (Request $request): bool => str_contains($request->url(), '/api/embed'));
});

test('indexes the profile books before searching when the setting is on', function () {
    fakeOllamaEmbeddings();
    fakeOpenLibrary();
    $fiveStar = ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');
    $threeStar = ratedBook('Mediano', 'Autor Qualquer', 3);
    ratedBook('Ruim', 'Autor Qualquer', 1);
    Book::factory()->create();
    Setting::put(EmbeddingRanker::SETTING, true);

    app(RecommendationService::class)->generate();

    expect(BookEmbedding::query()->where('model', configuredEmbeddingModel())->pluck('book_id')->all())
        ->toEqualCanonicalizing([$fiveStar->id, $threeStar->id]);
});

test('embeds the heaviest profile books in the first request when the books exceed one batch', function () {
    fakeOllamaEmbeddings();
    fakeOpenLibrary();
    $fiveStars = [ratedBook('Cinco A', 'Autor', 5), ratedBook('Cinco B', 'Autor', 5)];
    foreach (range(1, 33) as $number) {
        ratedBook("Dois {$number}", 'Autor', 2);
    }
    Setting::put(EmbeddingRanker::SETTING, true);

    app(RecommendationService::class)->generate();

    $firstRequest = Http::recorded(fn (Request $request): bool => str_contains($request->url(), '/api/embed'))
        ->first()[0];
    $prefix = config()->string('services.ollama.embedding_prefix');

    expect($firstRequest['input'])->toContain(
        ...array_map(fn (Book $book): string => $prefix.EmbeddingText::forBook($book), $fiveStars),
    );
});

test('still creates suggestions when Ollama is down and the setting is on', function () {
    fakeOllamaEmbeddings(status: 500);
    fakeOpenLibrary();
    ratedBook('Torto Arado', 'Itamar Vieira Junior', 5, 'Magic realism (Literature)');
    Setting::put(EmbeddingRanker::SETTING, true);

    expect(app(RecommendationService::class)->generate())->toBeGreaterThan(0)
        ->and(Recommendation::count())->toBeGreaterThan(0);
});
