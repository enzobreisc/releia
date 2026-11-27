<?php

namespace App\Http\Controllers;

use App\Enums\RecommendationStatus;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\RecommendationPresenter;
use App\Models\Book;
use App\Models\Recommendation;
use App\Services\Ai\RequestInterpreter;
use App\Services\Recommendation\RememberedRequest;
use App\Services\Recommendation\RequestedSuggestions;
use App\Services\RecommendationService;
use App\Services\UndoService;
use App\Support\Toast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SuggestionController extends Controller
{
    public function __construct(
        private readonly RecommendationService $suggestions,
        private readonly RequestedSuggestions $requests,
        private readonly RequestInterpreter $interpreter,
    ) {}

    public function index(): Response
    {
        $remembered = $this->requests->remembered();

        return Inertia::render('suggestions', [
            'suggestions' => fn () => Recommendation::query()
                ->with('basedOn')
                ->where('status', RecommendationStatus::New)
                ->whereNotIn('id', $remembered instanceof RememberedRequest ? $remembered->ids : [])
                ->latest('id')
                ->get()
                ->map(RecommendationPresenter::card(...))
                ->values(),
            'hasSources' => fn () => $this->suggestions->hasSources(),
            'request' => fn () => $this->rememberedRequest($remembered),
            'interpreter' => ['model' => config('services.ollama.chat_model')],
            'interpreterAvailability' => Inertia::defer(fn () => $this->interpreter->availability()->value),
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function rememberedRequest(?RememberedRequest $remembered): ?array
    {
        if (! $remembered instanceof RememberedRequest) {
            return null;
        }

        return [
            'text' => $remembered->text,
            'authors' => $remembered->authors,
            'excluded_authors' => $remembered->excludedAuthors,
            'max_pages' => $remembered->maxPages,
            'found' => count($remembered->ids),
            'results' => $this->requests->resultsOf($remembered)->map(RecommendationPresenter::card(...))->values(),
        ];
    }

    public function editions(Recommendation $recommendation): JsonResponse
    {
        return response()->json([
            'items' => BookPresenter::candidates($this->suggestions->editions($recommendation)),
        ]);
    }

    public function accept(Request $request, Recommendation $recommendation): RedirectResponse
    {
        if ($this->suggestions->accept($recommendation, $this->isbn($request))) {
            $book = Book::query()->latest('id')->firstOrFail();
            Toast::success(__('Adicionado a Quero ler'), $recommendation->title, [
                'label' => __('Pôr na fila'), 'method' => 'post', 'url' => route('queue.store', absolute: false), 'data' => ['book_id' => $book->id],
            ]);
        } else {
            Toast::success(__('Esse livro já está na biblioteca'), $recommendation->title);
        }

        return back();
    }

    public function alreadyRead(Request $request, Recommendation $recommendation): RedirectResponse
    {
        if ($this->suggestions->alreadyRead($recommendation, $this->isbn($request))) {
            $book = Book::query()->latest('id')->firstOrFail();
            Toast::success(__('Adicionado como lido'), $recommendation->title, [
                'label' => __('Avaliar'), 'method' => 'get', 'url' => route('books.show', $book, absolute: false),
            ]);
        } else {
            Toast::success(__('Esse livro já está na biblioteca'), $recommendation->title);
        }

        return back();
    }

    public function dismiss(Recommendation $recommendation, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([UndoService::scope('recommendations', ['id' => $recommendation->id])]);
        $this->suggestions->dismiss($recommendation);

        Toast::success(__('Sugestão dispensada'), $recommendation->title, null, $undo->remember($snapshot));

        return back();
    }

    private function isbn(Request $request): ?string
    {
        return $request->validate(['isbn_13' => ['nullable', 'string', 'max:20']])['isbn_13'] ?? null;
    }
}
