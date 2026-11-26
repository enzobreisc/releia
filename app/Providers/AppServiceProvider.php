<?php

namespace App\Providers;

use App\Events\QuickLogShortcutPressed;
use App\Native\ShowQuickLogWindow;
use App\Services\Ai\BookEmbeddingIndexer;
use App\Services\Ai\EmbeddingProvider;
use App\Services\Ai\OllamaEmbeddingProvider;
use App\Services\Ai\SimilarityScale;
use App\Services\Recommendation\CandidateEmbeddings;
use App\Services\Recommendation\CandidateRanker;
use App\Services\Recommendation\EmbeddingRanker;
use App\Services\Recommendation\ScoredRanker;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(EmbeddingProvider::class, fn (): EmbeddingProvider => new OllamaEmbeddingProvider(
            url: config()->string('services.ollama.url'),
            model: config()->string('services.ollama.embedding_model'),
            prefix: config()->string('services.ollama.embedding_prefix'),
            timeoutSeconds: config()->integer('services.ollama.timeout'),
        ));

        $this->app->bind(BookEmbeddingIndexer::class, fn (): BookEmbeddingIndexer => new BookEmbeddingIndexer(
            provider: $this->app->make(EmbeddingProvider::class),
            prefix: config()->string('services.ollama.embedding_prefix'),
        ));

        $this->app->bind(CandidateEmbeddings::class, fn (): CandidateEmbeddings => new CandidateEmbeddings(
            provider: $this->app->make(EmbeddingProvider::class),
            prefix: config()->string('services.ollama.embedding_prefix'),
        ));

        $this->app->bind(SimilarityScale::class, fn (): SimilarityScale => $this->configuredSimilarityScale());

        $this->app->bind(CandidateRanker::class, fn (Application $app): CandidateRanker => EmbeddingRanker::isEnabled()
            ? $app->make(EmbeddingRanker::class)
            : $app->make(ScoredRanker::class));
    }

    public function boot(): void
    {
        $this->configureDefaults();

        // The shortcut arrives over HTTP (_native/api/events), so the listener must be registered for every request.
        Event::listen(QuickLogShortcutPressed::class, ShowQuickLogWindow::class);
    }

    private function configuredSimilarityScale(): SimilarityScale
    {
        $floor = $this->configuredFloat('services.ollama.similarity_floor') ?? SimilarityScale::DEFAULT_FLOOR;
        $ceiling = $this->configuredFloat('services.ollama.similarity_ceiling') ?? SimilarityScale::DEFAULT_CEILING;

        try {
            return new SimilarityScale($floor, $ceiling);
        } catch (InvalidArgumentException $exception) {
            Log::warning('Invalid Ollama similarity range, using the default range instead', [
                'floor' => $floor,
                'ceiling' => $ceiling,
                'error' => $exception->getMessage(),
            ]);

            return new SimilarityScale(SimilarityScale::DEFAULT_FLOOR, SimilarityScale::DEFAULT_CEILING);
        }
    }

    /** An empty or missing env value is unset, not zero. */
    private function configuredFloat(string $key): ?float
    {
        $value = config($key);

        return is_numeric($value) ? (float) $value : null;
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
