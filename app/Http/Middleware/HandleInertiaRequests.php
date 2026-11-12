<?php

namespace App\Http\Middleware;

use App\Enums\Locale;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ShoppingItem;
use App\Services\DashboardService;
use App\Services\ReadingTimer;
use App\Support\Toast;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'locale' => app()->getLocale(),
            'language_tag' => Locale::from(app()->getLocale())->languageTag(),
            // Inside the native app, external links open in the browser through the server (Shell).
            'native' => (bool) config('nativephp-internal.running'),
            'counts' => fn () => [
                'books' => Book::count(),
                'queue' => QueueItem::count(),
                'shopping' => ShoppingItem::query()->whereNull('bought_at')->count(),
            ],
            'toast' => fn () => $request->session()->get(Toast::SESSION_KEY),
            'reading_now' => fn () => app(DashboardService::class)->sidebarCard(Carbon::today()),
            'has_live_session' => fn () => app(ReadingTimer::class)->current() !== null,
        ];
    }
}
