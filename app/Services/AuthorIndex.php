<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Models\Author;
use App\Models\Book;
use Illuminate\Support\Collection;

/** Per-author numbers for the authors list: ownership, reading, rating and share of all reading. */
class AuthorIndex
{
    private const int RATING_PRECISION = 1;

    /**
     * @return array{authors: list<array<string, mixed>>, authors_with_read_books: int}
     */
    public function build(): array
    {
        $authors = Author::query()
            ->with(['books' => fn ($query) => $query->with('currentReading')])
            ->has('books')
            ->orderByRaw('name COLLATE NOCASE')
            ->get();

        $totalPagesRead = $this->pagesRead($authors->flatMap->books->unique('id'));

        $rows = $authors->map(fn (Author $author) => $this->row($author, $totalPagesRead));

        return [
            'authors' => array_values($rows->all()),
            'authors_with_read_books' => $rows->where('read', '>', 0)->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function row(Author $author, int $totalPagesRead): array
    {
        $readBooks = $author->books->filter(fn (Book $book) => $this->isRead($book));
        $pagesRead = $this->pagesRead($readBooks);
        $ratings = $readBooks->map(fn (Book $book) => $book->currentReading?->rating)->filter();

        return [
            'id' => $author->id,
            'name' => $author->name,
            'photo_url' => $author->photoUrl(),
            'owned' => $author->books->count(),
            'read' => $readBooks->count(),
            'pages_read' => $pagesRead,
            'average_rating' => $ratings->isEmpty() ? null : round($ratings->avg(), self::RATING_PRECISION),
            'reading_share' => $totalPagesRead === 0 ? null : (int) round($pagesRead / $totalPagesRead * 100),
            'last_finished_title' => $this->lastFinished($readBooks)?->title,
            'books' => $author->books
                ->sortBy([fn (Book $a, Book $b) => $this->isRead($b) <=> $this->isRead($a), ['title', 'asc']])
                ->map(fn (Book $book) => [
                    'id' => $book->id,
                    'title' => $book->title,
                    'cover_url' => BookPresenter::coverUrl($book),
                    'is_read' => $this->isRead($book),
                ])
                ->values()
                ->all(),
        ];
    }

    private function isRead(Book $book): bool
    {
        return $book->currentReading?->status === ReadingStatus::Read;
    }

    /**
     * @param  Collection<int, Book>  $books
     */
    private function pagesRead(Collection $books): int
    {
        return $books->filter(fn (Book $book) => $this->isRead($book))->sum('pages');
    }

    /**
     * @param  Collection<int, Book>  $readBooks
     */
    private function lastFinished(Collection $readBooks): ?Book
    {
        return $readBooks
            ->sortByDesc(fn (Book $book) => [$book->currentReading?->finished_at, $book->currentReading?->id])
            ->first();
    }
}
