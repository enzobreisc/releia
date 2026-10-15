<?php

namespace App\Http\Presenters;

use App\Models\Book;
use App\Services\BookLookup\BookCandidate;

/** Formato dos livros enviado às páginas. */
final class BookPresenter
{
    /**
     * @return array{id: int, title: string, authors: string, cover_url: string|null, status: string|null, status_label: string|null, rating: int|null}
     */
    public static function card(Book $book): array
    {
        return [
            'id' => $book->id,
            'title' => $book->title,
            'authors' => $book->authors->pluck('name')->implode(', '),
            'cover_url' => self::coverUrl($book),
            'status' => $book->currentReading?->status->value,
            'status_label' => $book->currentReading?->status->label(),
            'rating' => $book->currentReading?->rating,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function detail(Book $book): array
    {
        $reading = $book->currentReading;

        return [
            'id' => $book->id,
            'title' => $book->title,
            'subtitle' => $book->subtitle,
            'authors' => $book->authors->pluck('name')->implode(', '),
            'isbn_13' => $book->isbn_13,
            'publisher' => $book->publisher,
            'published_year' => $book->published_year,
            'pages' => $book->pages,
            'genre' => $book->genre,
            'description' => $book->description,
            'cover_url' => self::coverUrl($book),
            'source_label' => $book->source->label(),
            'reading' => $reading === null ? null : [
                'status' => $reading->status->value,
                'rating' => $reading->rating,
                'review' => $reading->review,
                'started_at' => $reading->started_at?->toDateString(),
                'finished_at' => $reading->finished_at?->toDateString(),
                'current_page' => $reading->current_page,
            ],
            'readings_count' => $book->readings()->count(),
        ];
    }

    /**
     * Resultado de busca externa, marcando o que já está na biblioteca.
     *
     * @param  array<string, int>  $libraryIds  isbn_13 => id do livro
     * @return array<string, mixed>
     */
    public static function candidate(BookCandidate $candidate, array $libraryIds): array
    {
        return [
            ...$candidate->toArray(),
            'library_id' => $candidate->isbn13 !== null ? ($libraryIds[$candidate->isbn13] ?? null) : null,
        ];
    }

    private static function coverUrl(Book $book): ?string
    {
        return $book->cover_path === null
            ? null
            : route('books.cover', ['book' => $book, 'v' => $book->updated_at?->timestamp], absolute: false);
    }
}
