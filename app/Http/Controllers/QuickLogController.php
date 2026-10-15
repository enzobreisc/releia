<?php

namespace App\Http\Controllers;

use App\Http\Requests\QuickLogRequest;
use App\Models\Book;
use App\Services\DashboardService;
use App\Services\ReadingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/** Janela compacta da barra de menu: só leituras em andamento. */
class QuickLogController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboard,
        private readonly ReadingService $readings,
    ) {}

    public function show(): Response
    {
        return Inertia::render('quick-log', [
            'readings' => $this->dashboard->readingNow(),
            'streak' => $this->dashboard->streak(Carbon::today()),
        ]);
    }

    public function store(QuickLogRequest $request): RedirectResponse
    {
        $book = Book::query()->findOrFail($request->integer('book_id'));

        $this->readings->registerSession(
            $this->readings->readingFor($book),
            $request->integer('page_to'),
            $request->integer('minutes') ?: null,
            Carbon::today(),
        );

        return to_route('quick-log');
    }
}
