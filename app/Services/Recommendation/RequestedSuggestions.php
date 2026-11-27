<?php

namespace App\Services\Recommendation;

use App\Enums\RecommendationStatus;
use App\Models\Recommendation;
use App\Services\Ai\InterpreterTimedOut;
use App\Services\Ai\InterpreterUnavailable;
use App\Services\Ai\RequestInterpreter;
use App\Services\RecommendationService;
use Illuminate\Support\Collection;

/**
 * Suggestions for a request written in your own words: the model reads the request into authors, the names are
 * matched to your library, and the search answers with those authors' works. The last request is kept in the session.
 */
final class RequestedSuggestions
{
    public const SESSION_KEY = 'suggestion-request';

    /** The model may load on the first request, so the interpreting request outlasts its Ollama timeout. */
    private const TIME_LIMIT_MARGIN_SECONDS = 30;

    public function __construct(
        private readonly RequestInterpreter $interpreter,
        private readonly AuthorResolver $resolver,
        private readonly RecommendationService $suggestions,
    ) {}

    /**
     * @throws InterpreterUnavailable
     * @throws InterpreterTimedOut
     */
    public function interpret(string $text): InterpretedRequest
    {
        $this->extendInterpretTimeLimit();

        $filters = $this->interpreter->interpret($text);
        $resolution = $this->resolver->resolve($filters->authors, $filters->excludedAuthors);
        $hasUsableFilter = $resolution->authors !== [] || $resolution->excludedNames !== [] || $filters->maxPages !== null;

        return new InterpretedRequest(
            authors: $resolution->authorNames(),
            excludedAuthors: $resolution->excludedNames,
            maxPages: $filters->maxPages,
            understood: $hasUsableFilter || $filters->understood,
        );
    }

    /**
     * Replaces the remembered request, unless nothing was found because Open Library is down: the previous one stays.
     * Returns the ids of the suggestions it answers with.
     *
     * @return list<int>
     */
    public function search(SuggestionRequest $request): array
    {
        $resolution = $this->resolver->resolve($request->authors, $request->excludedAuthors);
        $ids = $this->suggestions->searchFor(SearchScope::request($resolution, $request->maxPages));

        if ($ids === [] && $this->suggestions->isSearchSourceUnavailable()) {
            return [];
        }

        session()->put(self::SESSION_KEY, [
            'text' => $request->text,
            'authors' => $resolution->authorNames(),
            'excluded_authors' => $resolution->excludedNames,
            'max_pages' => $request->maxPages,
            'ids' => $ids,
        ]);

        return $ids;
    }

    public function remembered(): ?RememberedRequest
    {
        $stored = session(self::SESSION_KEY);

        if (! is_array($stored)) {
            return null;
        }

        return new RememberedRequest(
            text: (string) $stored['text'],
            authors: array_values($stored['authors']),
            excludedAuthors: array_values($stored['excluded_authors']),
            maxPages: $stored['max_pages'],
            ids: array_values($stored['ids']),
        );
    }

    /**
     * The remembered suggestions that are still pending, in the order the request found them.
     *
     * @return Collection<int, Recommendation>
     */
    public function resultsOf(RememberedRequest $request): Collection
    {
        return Recommendation::query()
            ->with('basedOn')
            ->where('status', RecommendationStatus::New)
            ->whereIn('id', $request->ids)
            ->get()
            ->sortBy(fn (Recommendation $recommendation): int => (int) array_search($recommendation->id, $request->ids, true))
            ->values();
    }

    private function extendInterpretTimeLimit(): void
    {
        // Zero means no limit, as on the command line.
        if ((int) ini_get('max_execution_time') > 0) {
            set_time_limit((int) config('services.ollama.timeout') + self::TIME_LIMIT_MARGIN_SECONDS);
        }
    }
}
