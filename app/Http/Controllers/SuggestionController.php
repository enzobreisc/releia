<?php

namespace App\Http\Controllers;

use App\Enums\RecommendationStatus;
use App\Http\Presenters\RecommendationPresenter;
use App\Models\Recommendation;
use App\Services\RecommendationService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SuggestionController extends Controller
{
    public function __construct(private readonly RecommendationService $suggestions) {}

    public function index(): Response
    {
        return Inertia::render('suggestions', [
            'suggestions' => fn () => Recommendation::query()
                ->with('basedOn')
                ->where('status', RecommendationStatus::New)
                ->latest('id')
                ->get()
                ->map(RecommendationPresenter::card(...))
                ->values(),
            'hasSources' => fn () => $this->suggestions->hasSources(),
            'message' => session('message'),
        ]);
    }

    public function generate(): RedirectResponse
    {
        $added = $this->suggestions->generate();

        return to_route('suggestions.index')->with(
            'message',
            $added === 0 ? 'Nenhuma sugestão nova.' : "{$added} sugestões novas.",
        );
    }

    public function accept(Recommendation $recommendation): RedirectResponse
    {
        $added = $this->suggestions->accept($recommendation);

        return back()->with('message', $added ? 'Adicionado à estante "quero ler".' : 'Esse livro já está na biblioteca.');
    }

    public function alreadyRead(Recommendation $recommendation): RedirectResponse
    {
        $added = $this->suggestions->alreadyRead($recommendation);

        return back()->with('message', $added ? 'Adicionado como lido.' : 'Esse livro já está na biblioteca.');
    }

    public function dismiss(Recommendation $recommendation): RedirectResponse
    {
        $this->suggestions->dismiss($recommendation);

        return back();
    }
}
