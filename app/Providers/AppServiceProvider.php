<?php

namespace App\Providers;

use App\Events\QuickLogShortcutPressed;
use App\Native\ShowQuickLogWindow;
use App\Services\Ai\OllamaRequestInterpreter;
use App\Services\Ai\RequestInterpreter;
use App\Services\BookLookup\OpenLibraryAvailability;
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
        $this->app->scoped(OpenLibraryAvailability::class);
        $this->app->bind(RequestInterpreter::class, fn (): RequestInterpreter => new OllamaRequestInterpreter(
            config('services.ollama.url'),
            config('services.ollama.chat_model'),
            config('services.ollama.timeout'),
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
