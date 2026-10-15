<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Models\Book;
use App\Models\Reading;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LibraryController extends Controller
{
    private const SORTS = ['recent', 'title', 'rating'];

    public function index(Request $request): Response
    {
        $search = Book::normalizeSearch((string) $request->string('q'));
        $genre = $request->string('genre')->toString();
        $shelf = ReadingStatus::tryFrom($request->string('shelf')->toString());
        $sort = in_array($request->input('sort'), self::SORTS, true) ? $request->input('sort') : 'recent';

        $books = Book::query()
            ->with(['authors', 'currentReading'])
            ->addSelect(['current_rating' => $this->latestReading('rating')])
            ->when($search !== '', function (Builder $query) use ($search) {
                foreach (explode(' ', $search) as $term) {
                    $query->where('search_text', 'like', '%'.$term.'%');
                }
            })
            ->when($genre !== '', fn (Builder $query) => $query->where('genre', $genre))
            ->when($shelf, fn (Builder $query, ReadingStatus $shelf) => $query->whereIn(
                'books.id',
                $this->latestReadings()->where('status', $shelf->value)->select('book_id'),
            ))
            ->when($sort === 'title', fn (Builder $query) => $query->orderByRaw('title COLLATE NOCASE'))
            ->when($sort === 'rating', fn (Builder $query) => $query->orderByRaw('current_rating IS NULL, current_rating DESC'))
            ->latest('id')
            ->get();

        return Inertia::render('library', [
            'books' => $books->map(BookPresenter::card(...)),
            'shelves' => $this->shelves(),
            'genres' => Book::query()->whereNotNull('genre')->distinct()->orderBy('genre')->pluck('genre'),
            'filters' => [
                'q' => (string) $request->string('q'),
                'genre' => $genre,
                'shelf' => $shelf?->value,
                'sort' => $sort,
            ],
        ]);
    }

    /**
     * Contagem por estante, considerando só a leitura mais recente de cada livro
     * (um livro relido não conta como "lido" e "lendo" ao mesmo tempo).
     *
     * @return list<array{value: string|null, label: string, count: int}>
     */
    private function shelves(): array
    {
        $counts = $this->latestReadings()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $shelves = [['value' => null, 'label' => 'Todos', 'count' => Book::count()]];

        foreach ([ReadingStatus::Reading, ReadingStatus::WantToRead, ReadingStatus::Read, ReadingStatus::Abandoned] as $status) {
            $shelves[] = [
                'value' => $status->value,
                'label' => $status->shelfLabel(),
                'count' => (int) ($counts[$status->value] ?? 0),
            ];
        }

        return $shelves;
    }

    /**
     * Só a leitura mais recente de cada livro.
     *
     * @return Builder<Reading>
     */
    private function latestReadings(): Builder
    {
        return Reading::query()->whereIn('id', Reading::query()->selectRaw('max(id)')->groupBy('book_id'));
    }

    /**
     * @return Builder<Reading>
     */
    private function latestReading(string $column): Builder
    {
        return Reading::query()
            ->select($column)
            ->whereColumn('readings.book_id', 'books.id')
            ->latest('id')
            ->limit(1);
    }
}
