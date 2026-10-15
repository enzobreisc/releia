<?php

namespace App\Http\Presenters;

use App\Models\Book;
use App\Services\BookLookup\BookCandidate;

/** Formato dos livros enviado às páginas. */
final class BookPresenter
{
    /**
     * Cartão de livro. Na Biblioteca vêm também a posição na fila e o número de leituras.
     *
     * @return array{id: int, title: string, authors: string, cover_url: string|null, status: string|null, status_label: string|null, rating: int|null, queue_position: int|null, readings_count: int|null}
     */
    public static function card(Book $book, ?int $queuePosition = null): array
    {
        return [
            'id' => $book->id,
            'title' => $book->title,
            'authors' => $book->authors->pluck('name')->implode(', '),
            'cover_url' => self::coverUrl($book),
            'status' => $book->currentReading?->status->value,
            'status_label' => $book->currentReading?->status->label(),
            'rating' => $book->currentReading?->rating,
            'queue_position' => $queuePosition,
            'readings_count' => isset($book->readings_count) ? (int) $book->readings_count : null,
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
                'id' => $reading->id,
                'status' => $reading->status->value,
                'abandon_reason' => $reading->abandon_reason,
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
     * Resultados de busca externa, cada um marcado se o ISBN já está na biblioteca.
     *
     * @param  list<BookCandidate>  $candidates
     * @return list<array<string, mixed>>
     */
    public static function candidates(array $candidates): array
    {
        $isbns = array_values(array_filter(array_map(fn (BookCandidate $c) => $c->isbn13, $candidates)));

        /** @var array<string, int> $libraryIds */
        $libraryIds = Book::query()->whereIn('isbn_13', $isbns)->pluck('id', 'isbn_13')->all();

        return array_map(fn (BookCandidate $c) => self::candidate($c, $libraryIds), $candidates);
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

    public static function coverUrl(Book $book): ?string
    {
        return $book->cover_path === null
            ? null
            : route('books.cover', ['book' => $book, 'v' => $book->updated_at?->timestamp], absolute: false);
    }
}
