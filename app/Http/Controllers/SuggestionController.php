<?php

namespace App\Http\Controllers;

use App\Enums\RecommendationStatus;
use App\Http\Presenters\RecommendationPresenter;
use App\Models\Book;
use App\Models\Recommendation;
use App\Services\RecommendationService;
use App\Services\UndoService;
use App\Support\Toast;
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
        ]);
    }

    public function generate(): RedirectResponse
    {
        $added = $this->suggestions->generate();

        Toast::success(match ($added) {
            0 => 'Nenhuma sugestão nova',
            1 => '1 sugestão nova',
            default => "{$added} sugestões novas",
        });

        return to_route('suggestions.index');
    }

    public function accept(Recommendation $recommendation): RedirectResponse
    {
        if ($this->suggestions->accept($recommendation)) {
            $book = Book::query()->latest('id')->firstOrFail();
            Toast::success('Adicionado a Quero ler', $recommendation->title, [
                'label' => 'Pôr na fila', 'method' => 'post', 'url' => route('queue.store', absolute: false), 'data' => ['book_id' => $book->id],
            ]);
        } else {
            Toast::success('Esse livro já está na biblioteca', $recommendation->title);
        }

        return back();
    }

    public function alreadyRead(Recommendation $recommendation): RedirectResponse
    {
        if ($this->suggestions->alreadyRead($recommendation)) {
            $book = Book::query()->latest('id')->firstOrFail();
            Toast::success('Adicionado como lido', $recommendation->title, [
                'label' => 'Avaliar', 'method' => 'get', 'url' => route('books.show', $book, absolute: false),
            ]);
        } else {
            Toast::success('Esse livro já está na biblioteca', $recommendation->title);
        }

        return back();
    }

    public function dismiss(Recommendation $recommendation, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([UndoService::scope('recommendations', ['id' => $recommendation->id])]);
        $this->suggestions->dismiss($recommendation);

        Toast::success('Sugestão dispensada', $recommendation->title, null, $undo->remember($snapshot));

        return back();
    }
}
