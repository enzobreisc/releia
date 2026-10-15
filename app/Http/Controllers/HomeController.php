<?php

namespace App\Http\Controllers;

use App\Http\Presenters\RecommendationPresenter;
use App\Services\DashboardService;
use App\Services\ProfileService;
use App\Services\RecommendationService;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(DashboardService $dashboard, RecommendationService $suggestions, ProfileService $profile): Response
    {
        $today = Carbon::today();

        return Inertia::render('home', [
            // Nome do perfil, para o cumprimento ("Boa noite, Ana").
            'reader_name' => $profile->reader()['name'],
            'reading' => $dashboard->readingNow(),
            'goal' => $dashboard->yearGoal($today),
            'recent' => $dashboard->recentlyFinished(),
            // Escolhida uma vez por dia entre as sugestões novas; não chama a rede.
            'suggestion' => function () use ($suggestions) {
                $pick = $suggestions->today()?->load('basedOn');

                return $pick === null ? null : RecommendationPresenter::card($pick);
            },
        ]);
    }
}
