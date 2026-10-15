<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\ReadingPresenter;
use App\Http\Requests\StoreBookRequest;
use App\Models\Book;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Services\BookLookupService;
use App\Services\LibraryService;
use App\Services\ReadingService;
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
     * Adicionar livro. `q` (e `editora`, opcional) busca nas fontes externas;
     * `obra` lista as edições de uma obra e `isbn` carrega os detalhes de uma
     * edição para a prévia. Os dois últimos chegam por recarga parcial.
     */
    public function create(Request $request): Response
    {
        $query = trim((string) $request->string('q'));
        $publisher = trim((string) $request->string('editora'));
        $work = OpenLibraryProvider::workKey('/works/'.$request->string('obra'));
        $isbn = Isbn::toIsbn13((string) $request->string('isbn'));

        return Inertia::render('adicionar', [
            'query' => $query,
            'publisher' => $publisher,
            'results' => fn () => $query === '' ? [] : $this->candidates($this->lookup->search($query, $publisher)),
            'editions' => fn () => $work === null ? null : [
                'work_key' => $work,
                'items' => $this->candidates($this->lookup->editions($work, publisher: $publisher)),
            ],
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

    public function show(Book $book, ReadingService $readings): Response
    {
        $book->load(['authors', 'currentReading']);
        $reading = $book->currentReading;

        return Inertia::render('livro', [
            'book' => BookPresenter::detail($book),
            'slug' => Str::slug($book->title),
            'statuses' => ReadingStatus::options(),
            'progress' => $reading === null ? null : $readings->progress($reading),
            'sessions' => $reading === null ? [] : $reading->sessions()
                ->orderByDesc('read_on')
                ->orderByDesc('id')
                ->get()
                ->map(ReadingPresenter::session(...))
                ->values(),
            // Sessões só entram em livros "quero ler" ou "lendo" (ver ReadingService).
            'can_log' => $reading !== null && in_array($reading->status, [ReadingStatus::QueroLer, ReadingStatus::Lendo], true),
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
