<?php

declare(strict_types=1);

require __DIR__.'/support.php';
require __DIR__.'/inertia.php';

use App\Enums\LibrarySort;
use App\Enums\Locale;
use App\Enums\ReadingStatus;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Author;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Models\Setting;
use App\Services\ReadingTimer;
use App\Services\StatsService;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/**
 * @return array<string, string> Slug to URL, in manifest order.
 */
function staticPages(): array
{
    $pages = [
        'home' => '/',
        'library' => '/library',
        'library-shelf-read' => '/library?shelf=read',
    ];

    foreach (LibrarySort::cases() as $sort) {
        $pages["library-sort-{$sort->value}"] = "/library?sort={$sort->value}";
    }

    $pages['library-add'] = '/library/add';

    foreach (Book::query()->orderBy('id')->pluck('id') as $bookId) {
        $pages["book-{$bookId}"] = "/library/{$bookId}";
    }

    $pages['bookcase-setup'] = '/library/bookcase/setup';
    $pages['authors'] = '/authors';

    foreach (Author::query()->orderBy('id')->pluck('id') as $authorId) {
        $pages["author-{$authorId}"] = "/authors/{$authorId}";
    }

    $pages['timeline'] = '/timeline';
    $pages['stats'] = '/stats';

    foreach (app(StatsService::class)->years() as $year) {
        $pages["stats-{$year}"] = "/stats?year={$year}";
    }

    $pages['stats-all'] = '/stats?year=all';
    $pages['wrapped'] = '/wrapped';
    $pages['profile'] = '/profile';
    $pages['queue'] = '/queue';
    $pages['shopping'] = '/shopping';
    $pages['suggestions'] = '/suggestions';
    $pages['quick-log'] = '/quick-log';

    return $pages;
}

/**
 * @return array<string, mixed>
 */
function fetchInertiaPage(Kernel $kernel, string $url, string $version): array
{
    $request = Request::create($url, 'GET', server: [
        'HTTP_X_INERTIA' => 'true',
        'HTTP_X_INERTIA_VERSION' => $version,
        'HTTP_ACCEPT' => 'text/html, application/xhtml+xml',
    ]);

    $response = $kernel->handle($request);
    $kernel->terminate($request, $response);

    if ($response->getStatusCode() !== 200) {
        throw new RuntimeException("GET {$url} answered {$response->getStatusCode()}.");
    }

    return json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
}

/**
 * @param  array<string, string>  $pages
 * @param  array<string, array<int, string|null>>  $remote
 */
function dumpPages(array $pages, string $directory, array $remote, Kernel $kernel, string $version): void
{
    foreach ($pages as $slug => $url) {
        $recordedBefore = Http::recorded()->count();
        $page = fetchInertiaPage($kernel, $url, $version);

        if ($recordedBefore !== Http::recorded()->count()) {
            throw new RuntimeException("Network lookup while dumping {$url}.");
        }

        if (! array_key_exists('component', $page)) {
            throw new RuntimeException("{$url} did not render an Inertia page.");
        }

        $json = json_encode(withRemoteUrls($page, $remote), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        File::put("{$directory}/{$slug}.json", $json.PHP_EOL);
    }
}

function startLiveSession(): void
{
    $session = ReadingSession::query()
        ->whereHas('reading', fn (Builder $query) => $query->where('status', ReadingStatus::Reading->value))
        ->latest('read_on')
        ->latest('id')
        ->firstOrFail();

    $book = $session->reading->book;

    app(ReadingTimer::class)->start($book, (int) $book->currentReading->current_page);
}

function restoreLocale(?string $locale): void
{
    if ($locale === null) {
        Setting::query()->whereKey(Locale::SETTING)->delete();

        return;
    }

    Setting::put(Locale::SETTING, $locale);
}

$app = bootstrapDemoApplication();
Http::fake(['*' => Http::response('', 503)]);

$kernel = $app->make(Kernel::class);
$version = (string) $app->make(HandleInertiaRequests::class)->version(Request::create('/'));
$remote = remoteUrlsFromState();
$staticPages = staticPages();
$livePages = ['live-session' => '/live-session', 'home-live' => '/'];
$originalLocale = Setting::get(Locale::SETTING);

File::deleteDirectory(DEMO_GOLDEN_PATH);

try {
    foreach (LOCALE_DIRECTORIES as $locale => $directory) {
        Setting::put(Locale::SETTING, $locale);
        $path = DEMO_GOLDEN_PATH."/{$directory}";
        File::ensureDirectoryExists($path);

        dumpPages($staticPages, $path, $remote, $kernel, $version);

        startLiveSession();

        try {
            dumpPages($livePages, $path, $remote, $kernel, $version);
        } finally {
            app(ReadingTimer::class)->discard();
        }
    }
} finally {
    restoreLocale($originalLocale);
}

$manifest = [];

foreach ([...$staticPages, ...$livePages] as $slug => $url) {
    $manifest[] = ['slug' => $slug, 'url' => $url];
}

File::put(DEMO_GOLDEN_PATH.'/manifest.json', json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).PHP_EOL);

echo 'dumped ', count($manifest), ' pages per locale', PHP_EOL;
