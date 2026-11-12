<?php

namespace App\Http\Controllers;

use App\Http\Presenters\LiveSessionPresenter;
use App\Http\Presenters\RecommendationPresenter;
use App\Services\DashboardService;
use App\Services\ProfileService;
use App\Services\ReadingActivity;
use App\Services\ReadingTimer;
use App\Services\RecommendationService;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(
        DashboardService $dashboard,
        ReadingActivity $activity,
        ReadingTimer $timer,
        RecommendationService $suggestions,
        ProfileService $profile,
    ): Response {
        $today = Carbon::today();

        return Inertia::render('home', [
            'reader_name' => $profile->reader()['name'],
            'reading' => $dashboard->readingNow(),
            'goal' => $dashboard->yearGoal($today),
            'today' => [
                'pages' => $activity->pagesOn($today),
                'average' => $activity->averagePagesPerReadingDay(),
                'goal' => $dashboard->dailyGoal(),
                'week' => $activity->lastWeekLevels($today),
                'streak' => $dashboard->streak($today),
            ],
            'live_session' => LiveSessionPresenter::summary($timer),
            'next_in_queue' => $dashboard->nextInQueue(),
            'recent' => $dashboard->recentlyFinished(),
            // Picked once a day from the new suggestions, so the page never waits on the network.
            'suggestion' => function () use ($suggestions) {
                $pick = $suggestions->today()?->load('basedOn');

                return $pick === null ? null : RecommendationPresenter::card($pick);
            },
        ]);
    }
}
