<?php

declare(strict_types=1);

use App\Http\Middleware\HandleInertiaRequests;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

require __DIR__.'/../../vendor/autoload.php';

const DEMO_FIXED_NOW = '2026-11-26 12:00:00';
const DEMO_FAKER_SEED = 20261126;
const DEMO_MARKER = 'releia-demo';
const DEMO_DATA_PATH = __DIR__.'/../data';
const DEMO_GOLDEN_PATH = __DIR__.'/../golden';
const DEMO_INERTIA_VERSION = '7c7bff6d8b7d0a9c29e2b3f3a9ca1ec6';
const LOCALE_DIRECTORIES = ['pt_BR' => 'pt-BR', 'en' => 'en'];

function bootstrapDemoApplication(): Application
{
    $app = require __DIR__.'/../../bootstrap/app.php';
    $app->make(ConsoleKernel::class)->bootstrap();

    assertThrowawayEnvironment();
    pinInertiaVersion($app);

    Carbon::setTestNow(DEMO_FIXED_NOW);
    CarbonImmutable::setTestNow(DEMO_FIXED_NOW);
    fake()->seed(DEMO_FAKER_SEED);
    mt_srand(DEMO_FAKER_SEED);

    return $app;
}

/**
 * The Inertia version hashes public/build, which differs between a clean checkout and the machine that recorded the goldens.
 */
function pinInertiaVersion(Application $app): void
{
    $app->bind(HandleInertiaRequests::class, fn () => new class extends HandleInertiaRequests
    {
        public function version(Request $request): ?string
        {
            return DEMO_INERTIA_VERSION;
        }
    });
}

function assertThrowawayEnvironment(): void
{
    $database = config('database.connections.sqlite.database');

    if (config('database.default') !== 'sqlite'
        || ! is_string($database)
        || ! str_contains($database, DEMO_MARKER)
        || ! str_contains(storage_path(), DEMO_MARKER)
    ) {
        throw new RuntimeException('Refusing to run: the sqlite database and the storage path must be inside a releia-demo temporary directory.');
    }
}
