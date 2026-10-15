<?php

namespace App\Http\Controllers;

use App\Http\Presenters\StatsPresenter;
use App\Services\StatsService;
use App\Support\StatsPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StatsController extends Controller
{
    public function __construct(private readonly StatsService $stats) {}

    /** Estatísticas de um ano (?year=2026) ou do histórico (?year=all). */
    public function index(Request $request): Response
    {
        $years = $this->stats->years();
        $requested = $request->string('year')->toString();
        $history = $requested === 'all';
        $year = in_array((int) $requested, $years, true) ? (int) $requested : $years[0];

        $period = $history ? $this->stats->period(null) : StatsPeriod::year($year);

        return Inertia::render('stats', [
            'selected' => $history ? 'all' : (string) $year,
            'years' => $years,
            'indicators' => $this->stats->indicators($period),
            'monthly' => array_map(fn (array $bucket) => [
                'label' => StatsPresenter::bucketLabel($bucket['key'], $history),
                'count' => $bucket['count'],
            ], $this->stats->booksPerBucket($period)),
            'genres' => $this->stats->genres($period),
            'authors' => $this->stats->authors($period),
            'extremes' => $this->extremes($period),
            'best_month' => $this->bestMonth($period),
            'streak' => $this->stats->streaks($period),
            // No histórico, o calendário mostra os últimos 365 dias.
            'calendar' => $this->stats->heatmap($history ? StatsPeriod::lastDays(365) : $period),
            'forecast' => $this->stats->forecast($period),
        ]);
    }

    /** @return array{fastest: array<string, mixed>|null, longest: array<string, mixed>|null} */
    private function extremes(StatsPeriod $period): array
    {
        $extremes = $this->stats->extremes($period);

        return [
            'fastest' => StatsPresenter::reading($extremes['fastest']),
            'longest' => StatsPresenter::reading($extremes['longest']),
        ];
    }

    /** @return array{label: string, count: int}|null */
    private function bestMonth(StatsPeriod $period): ?array
    {
        $best = $this->stats->bestMonth($period);

        return $best === null ? null : [
            'label' => StatsPresenter::monthName($best['month']),
            'count' => $best['count'],
        ];
    }
}
