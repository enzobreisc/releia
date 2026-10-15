<?php

namespace App\Http\Controllers;

use App\Http\Presenters\BookPresenter;
use App\Models\Book;
use App\Services\ProfileService;
use App\Services\StatsService;
use App\Support\StatsPeriod;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function __construct(
        private readonly ProfileService $profile,
        private readonly StatsService $stats,
    ) {}

    public function show(): Response
    {
        $history = $this->stats->period(null);
        $indicators = $this->stats->indicators($history);

        return Inertia::render('profile', [
            'since' => $history->start->format('Y-m'),
            'totals' => [
                'books_read' => $indicators['books_read'],
                'pages_read' => $indicators['pages_read'],
                'streak' => $this->stats->streaks($history)['current'],
            ],
            'pinned' => $this->profile->pinned()->map(fn (Book $book) => [
                ...BookPresenter::card($book),
                'genre' => $book->genre,
            ]),
            'pin_options' => Book::query()
                ->whereNotIn('id', $this->profile->pinnedIds())
                ->orderByRaw('title COLLATE NOCASE')
                ->get(['id', 'title'])
                ->map(fn (Book $book) => ['id' => $book->id, 'title' => $book->title]),
            'pin_limit' => ProfileService::MAX_PINS,
            'calendar' => $this->stats->heatmap(StatsPeriod::year((int) now()->year)),
            'activity' => $this->profile->recentActivity(),
        ]);
    }

    /** Fixa um livro na seção "Livros fixados". */
    public function pin(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
        ]);

        $pinned = $this->profile->pin(Book::query()->whereKey($data['book_id'])->firstOrFail());

        return $pinned
            ? back()
            : back()->withErrors(['book_id' => 'Você pode fixar até '.ProfileService::MAX_PINS.' livros.']);
    }

    public function unpin(Book $book): RedirectResponse
    {
        $this->profile->unpin($book);

        return back();
    }
}
