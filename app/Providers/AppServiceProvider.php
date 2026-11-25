<?php

namespace App\Providers;

use App\Events\QuickLogShortcutPressed;
use App\Native\ShowQuickLogWindow;
use App\Services\Ai\BookEmbeddingIndexer;
use App\Services\Ai\EmbeddingProvider;
use App\Services\Ai\OllamaEmbeddingProvider;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

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

    }

    public function boot(): void
    {
        $this->configureDefaults();

        // The shortcut arrives over HTTP (_native/api/events), so the listener must be registered for every request.
        Event::listen(QuickLogShortcutPressed::class, ShowQuickLogWindow::class);
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
