<?php

namespace App\Http\Controllers;

use App\Http\Presenters\BookPresenter;
use App\Models\Author;
use App\Models\Book;
use App\Services\AuthorService;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class AuthorController extends Controller
{
    public function __construct(private readonly AuthorService $authors) {}

    /** Autores da biblioteca, com quantos livros de cada um. */
    public function index(): Response
    {
        return Inertia::render('authors', [
            'authors' => Author::query()
                ->withCount('books')
                ->has('books')
                ->orderByRaw('name COLLATE NOCASE')
                ->get()
                ->map(fn (Author $author) => ['id' => $author->id, 'name' => $author->name, 'books' => $author->books_count])
                ->values(),
        ]);
    }

    /** Os livros do autor na biblioteca. As outras obras chegam à parte (`works`), por serem de rede. */
    public function show(Author $author): Response
    {
        $books = Book::query()
            ->with(['authors', 'currentReading'])
            ->whereHas('authors', fn ($query) => $query->whereIn('authors.id', $this->authors->sameAuthors($author)->pluck('id')))
            ->orderByRaw('published_year IS NULL, published_year')
            ->orderBy('title')
            ->get();

        return Inertia::render('author', [
            'author' => ['id' => $author->id, 'name' => $author->name],
            'books' => $books->map(fn (Book $book) => BookPresenter::spine($book))->values(),
        ]);
    }

    /** Obras do autor que faltam na biblioteca; `verified` falso quando não foi possível identificar o autor. */
    public function works(Author $author): JsonResponse
    {
        return response()->json($this->authors->works($author));
    }
}
