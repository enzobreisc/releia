<?php

namespace App\Http\Middleware;

use App\Models\Book;
use App\Models\Note;
use App\Models\QueueItem;
use App\Services\DashboardService;
use App\Support\Toast;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // Dentro do app nativo, links externos abrem no navegador pelo servidor (Shell).
            'native' => (bool) config('nativephp-internal.running'),
            'counts' => fn () => [
                'books' => Book::count(),
                'notes' => Note::count(),
                'queue' => QueueItem::count(),
            ],
            // Aviso da última ação (App\Support\Toast), uma vez só.
            'toast' => fn () => $request->session()->get(Toast::SESSION_KEY),
            // Mini cartão "lendo agora" da barra lateral; null quando nada está em andamento.
            'reading_now' => fn () => app(DashboardService::class)->sidebarCard(Carbon::today()),
        ];
    }
}
