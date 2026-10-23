<?php

namespace App\Http\Controllers;

use App\Http\Presenters\TimelinePresenter;
use App\Services\TimelineService;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class TimelineController extends Controller
{
    public function __construct(private readonly TimelineService $timeline) {}

    public function index(): Response
    {
        return Inertia::render('timeline', [
            'today' => Carbon::today()->toDateString(),
            'years' => array_map(fn (array $year) => [
                'year' => $year['year'],
                'readings' => array_map(TimelinePresenter::entry(...), $year['entries']),
            ], $this->timeline->years()),
        ]);
    }
}
