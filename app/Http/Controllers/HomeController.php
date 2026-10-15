<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(DashboardService $dashboard): Response
    {
        $today = Carbon::today();

        return Inertia::render('inicio', [
            'reading' => $dashboard->readingNow(),
            'goal' => $dashboard->yearGoal($today),
            'recent' => $dashboard->recentlyFinished(),
        ]);
    }
}
