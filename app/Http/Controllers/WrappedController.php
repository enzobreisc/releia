<?php

namespace App\Http\Controllers;

use App\Http\Presenters\StatsPresenter;
use App\Services\StatsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WrappedController extends Controller
{
    public function __construct(private readonly StatsService $stats) {}

    /** Retrospectiva de um ano (?year=2026). Padrão: o ano atual. */
    public function show(Request $request): Response
    {
        $years = $this->stats->years();
        $requested = (int) $request->input('year');
        $year = in_array($requested, $years, true) ? $requested : $years[0];

        $wrapped = $this->stats->wrapped($year);
        $best = $wrapped['best_month'];

        return Inertia::render('wrapped', [
            'year' => $year,
            'years' => $years,
            'summary' => [
                'books_read' => $wrapped['indicators']['books_read'],
                'pages_read' => $wrapped['indicators']['pages_read'],
            ],
            'genre' => $wrapped['genre'],
            'author' => $wrapped['author'],
            'fastest' => StatsPresenter::reading($wrapped['extremes']['fastest']),
            'longest' => StatsPresenter::reading($wrapped['extremes']['longest']),
            'best_month' => $best === null ? null : [
                'label' => StatsPresenter::monthName($best['month']),
                'count' => $best['count'],
            ],
            'streak' => $wrapped['streak']['longest'],
            'top' => $wrapped['top']->map(fn ($reading) => StatsPresenter::reading($reading))->values(),
            'rereads' => $wrapped['rereads'],
        ]);
    }
}
