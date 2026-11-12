<?php

namespace App\Http\Controllers;

use App\Enums\LibrarySort;
use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Models\Book;
use App\Models\Bookshelf;
use App\Models\QueueItem;
use App\Models\Reading;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LibraryController extends Controller
{
    public function index(Request $request): Response
    {
        $search = Book::normalizeSearch((string) $request->string('q'));
        $genre = $request->string('genre')->toString();
        $shelf = ReadingStatus::tryFrom($request->string('shelf')->toString());
        $sort = LibrarySort::tryFrom($request->string('sort')->toString()) ?? LibrarySort::Recent;

        $query = Book::query()
            ->with(['authors', 'currentReading'])
            ->withCount('readings')
            ->addSelect(['current_rating' => Reading::currentRatingOfBook()])
            ->when($search !== '', function (Builder $query) use ($search) {
                foreach (explode(' ', $search) as $term) {
                    $query->where('search_text', 'like', '%'.$term.'%');
                }
            })
            ->when($genre !== '', fn (Builder $query) => $query->where('genre', $genre))
            ->when($shelf, fn (Builder $query, ReadingStatus $shelf) => $query->whereIn(
                'books.id',
                Reading::query()->current()->where('status', $shelf->value)->select('book_id'),
            ));

        $books = $sort->applyTo($query)->latest('id')->get();

        /** @var array<int, int> $positions */
        $positions = QueueItem::query()->pluck('position', 'book_id')->map(fn ($position) => (int) $position)->all();

        return Inertia::render('library', [
            'books' => $books->map(fn (Book $book) => BookPresenter::spine($book, $positions[$book->id] ?? null)),
            'shelves' => $this->shelves(),
            'bookshelves' => Bookshelf::query()->orderBy('position')->get(['id', 'name']),
            'genres' => Book::query()->whereNotNull('genre')->distinct()->orderBy('genre')->pluck('genre'),
            'filters' => [
                'q' => (string) $request->string('q'),
                'genre' => $genre,
                'shelf' => $shelf?->value,
                'sort' => $sort->value,
            ],
        ]);
    }

    /**
     * Count per shelf, considering only each book's most recent reading
     * (a reread book does not count as both "read" and "reading").
     *
     * @return list<array{value: string|null, label: string, count: int}>
     */
    private function shelves(): array
    {
        $counts = Reading::countByCurrentStatus();

        $shelves = [['value' => null, 'label' => __('Todos'), 'count' => Book::count()]];

        foreach ([ReadingStatus::Reading, ReadingStatus::WantToRead, ReadingStatus::Read, ReadingStatus::Abandoned] as $status) {
            $shelves[] = [
                'value' => $status->value,
                'label' => $status->shelfLabel(),
                'count' => (int) ($counts[$status->value] ?? 0),
            ];
        }

        return $shelves;
    }
}
