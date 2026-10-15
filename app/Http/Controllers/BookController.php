<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\NotePresenter;
use App\Http\Requests\StoreBookRequest;
use App\Models\Book;
use App\Models\Note;
use App\Models\QueueItem;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookupService;
use App\Services\LibraryService;
use App\Support\Isbn;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BookController extends Controller
{
    public function __construct(
        private readonly BookLookupService $lookup,
        private readonly LibraryService $library,
    ) {}

    /**
     * Adicionar livro. `q` busca nas fontes externas; `isbn` carrega os
     * detalhes completos de um resultado para a prévia (recarga parcial).
     */
    public function create(Request $request): Response
    {
        $query = trim((string) $request->string('q'));
        $isbn = Isbn::toIsbn13((string) $request->string('isbn'));

        return Inertia::render('adicionar', [
            'query' => $query,
            'results' => fn () => $query === '' ? [] : $this->candidates($this->lookup->search($query)),
            'preview' => fn () => $isbn === null ? null : $this->preview($isbn),
            'statuses' => ReadingStatus::options(),
        ]);
    }

    public function store(StoreBookRequest $request): RedirectResponse
    {
        /** @var array{title: string, subtitle?: string|null, authors?: list<string>, isbn_13?: string|null, isbn_10?: string|null, publisher?: string|null, published_year?: int|null, pages?: int|null, genre?: string|null, description?: string|null, cover_url?: string|null, source?: string|null, status: string} $data */
        $data = $request->validated();

        $book = $this->library->add($data);

        return to_route('livros.show', $book);
    }

    public function show(Book $book): Response
    {
        $book->load(['authors', 'currentReading']);

        return Inertia::render('livro', [
            'book' => BookPresenter::detail($book),
            'slug' => Str::slug($book->title),
            'statuses' => ReadingStatus::options(),
            // Fase 3: notas do livro e se ele já está na fila.
            'notes' => fn () => Note::query()
                ->with(['book:id,title', 'tags:id,name'])
                ->where('book_id', $book->id)
                ->latest('updated_at')
                ->get()
                ->map(NotePresenter::card(...))
                ->values(),
            'queued' => fn () => QueueItem::query()->where('book_id', $book->id)->exists(),
        ]);
    }

    public function destroy(Book $book): RedirectResponse
    {
        $this->library->remove($book);

        return to_route('biblioteca');
    }

    /**
     * @param  list<BookCandidate>  $candidates
     * @return list<array<string, mixed>>
     */
    private function candidates(array $candidates): array
    {
        $isbns = array_values(array_filter(array_map(fn (BookCandidate $c) => $c->isbn13, $candidates)));

        /** @var array<string, int> $libraryIds */
        $libraryIds = Book::query()->whereIn('isbn_13', $isbns)->pluck('id', 'isbn_13')->all();

        return array_map(fn (BookCandidate $c) => BookPresenter::candidate($c, $libraryIds), $candidates);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function preview(string $isbn): ?array
    {
        $candidate = $this->lookup->findByIsbn($isbn);

        return $candidate === null ? null : $this->candidates([$candidate])[0];
    }
}
