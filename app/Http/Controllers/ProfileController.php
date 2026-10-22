<?php

namespace App\Http\Controllers;

use App\Enums\Locale;
use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Models\Book;
use App\Models\Reading;
use App\Services\ProfileService;
use App\Services\StatsService;
use App\Services\UndoService;
use App\Support\StatsPeriod;
use App\Support\Toast;
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

    /** Avatar: the last 25 reading days on a 5×5 grid. */
    private const AVATAR_DAYS = 25;

    private const TOP_GENRES = 3;

    public function show(Request $request): Response
    {
        $history = $this->stats->period(null);
        $indicators = $this->stats->indicators($history);
        $streaks = $this->stats->streaks($history);

        // Calendar year: only years with activity; any other value falls back to the current one.
        $years = $this->stats->years();
        $year = in_array($request->integer('year'), $years, true) ? $request->integer('year') : $years[0];
        $yearPeriod = StatsPeriod::year($year);

        return Inertia::render('profile', [
            'reader' => $this->profile->reader(),
            'locales' => Locale::options(),
            'since' => $history->start->format('Y-m'),
            'totals' => [
                'books_read' => $indicators['books_read'],
                'pages_read' => $indicators['pages_read'],
                'pages_per_day' => $indicators['pages_per_day'],
                'streak' => $streaks['current'],
                'longest_streak' => $streaks['longest'],
            ],
            'genres' => $this->stats->genres($history, self::TOP_GENRES),
            'avatar' => array_column($this->stats->heatmap(StatsPeriod::lastDays(self::AVATAR_DAYS)), 'level'),
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
            'year_books' => $this->yearBooks($year),
            'year' => $year,
            'years' => $years,
            'calendar' => $this->stats->heatmap($yearPeriod),
            'year_summary' => [
                'reading_days' => $this->stats->indicators($yearPeriod)['reading_days'],
                'longest_streak' => $this->stats->streaks($yearPeriod)['longest'],
            ],
            'activity' => $this->profile->recentActivity(),
        ]);
    }

    /** The reader's name and tagline. */
    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:60'],
            'bio' => ['nullable', 'string', 'max:160'],
        ]);

        $this->profile->updateReader($data['name'] ?? null, $data['bio'] ?? null);

        Toast::success(__('Perfil salvo'));

        return back();
    }

    /** Pins a book to the "Pinned books" section. */
    public function pin(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
        ]);

        $book = Book::query()->whereKey($data['book_id'])->firstOrFail();

        if (! $this->profile->pin($book)) {
            return back()->withErrors(['book_id' => __('Você pode fixar até :max livros.', ['max' => ProfileService::MAX_PINS])]);
        }

        Toast::success(__('Fixado no perfil'), $book->title);

        return back();
    }

    public function unpin(Book $book, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([UndoService::scope('settings', ['key' => ProfileService::PINS_SETTING], 'key')]);
        $this->profile->unpin($book);

        Toast::success(__('Desafixado'), $book->title, null, $undo->remember($snapshot));

        return back();
    }

    /**
     * Books finished in the year, in the order they were finished, for the profile shelf.
     *
     * @return list<array<string, mixed>>
     */
    private function yearBooks(int $year): array
    {
        return Reading::query()
            ->with(['book.authors', 'book.currentReading'])
            ->where('status', ReadingStatus::Read->value)
            ->whereBetween('finished_at', ["{$year}-01-01", "{$year}-12-31"])
            ->orderBy('finished_at')
            ->get()
            ->unique('book_id')
            ->map(fn (Reading $reading) => BookPresenter::spine($reading->book))
            ->values()
            ->all();
    }
}
