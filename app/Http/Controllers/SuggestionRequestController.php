<?php

namespace App\Http\Controllers;

use App\Http\Requests\InterpretSuggestionRequest;
use App\Http\Requests\StoreSuggestionRequest;
use App\Services\Ai\InterpreterUnavailable;
use App\Services\Recommendation\RequestedSuggestions;
use App\Services\RecommendationService;
use App\Support\Toast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;

class SuggestionRequestController extends Controller
{
    public function __construct(
        private readonly RequestedSuggestions $requests,
        private readonly RecommendationService $suggestions,
    ) {}

    public function interpret(InterpretSuggestionRequest $request): JsonResponse
    {
        try {
            $interpreted = $this->requests->interpret($request->text());
        } catch (InterpreterUnavailable $exception) {
            return response()->json(['availability' => $exception->availability->value], 503);
        }

        return response()->json([
            'authors' => $interpreted->authors,
            'excluded_authors' => $interpreted->excludedAuthors,
            'max_pages' => $interpreted->maxPages,
            'understood' => $interpreted->understood,
        ]);
    }

    public function store(StoreSuggestionRequest $request): RedirectResponse
    {
        $ids = $this->requests->search($request->suggestionRequest());

        if ($ids === [] && $this->suggestions->isSearchSourceUnavailable()) {
            Toast::error(__('A Open Library está indisponível'), __('Tente de novo em alguns minutos.'));
        }

        return to_route('suggestions.index');
    }
}
