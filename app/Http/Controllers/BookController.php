<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\NotePresenter;
use App\Http\Presenters\ReadingPresenter;
use App\Http\Requests\StoreBookRequest;
use App\Models\Book;
use App\Models\Note;
use App\Models\QueueItem;
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
     * Adicionar livro. `q` (e `publisher`, opcional) busca nas fontes externas;
     * `work` lista as edições de uma obra e `isbn` carrega os detalhes de uma
     * edição para a prévia. Os dois últimos chegam por recarga parcial.
     */
    public function create(Request $request): Response
    {
        $query = trim((string) $request->string('q'));
        $publisher = trim((string) $request->string('publisher'));
        $work = OpenLibraryProvider::workKey('/works/'.$request->string('work'));
        $isbn = Isbn::toIsbn13((string) $request->string('isbn'));

        return Inertia::render('add-book', [
            'query' => $query,
            'publisher' => $publisher,
            'results' => fn () => $query === '' ? [] : BookPresenter::candidates($this->lookup->search($query, $publisher)),
            'editions' => fn () => $work === null ? null : [
                'work_key' => $work,
                'items' => BookPresenter::candidates($this->lookup->editions($work, publisher: $publisher)),
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

        return to_route('books.show', $book);
    }

    public function show(Book $book, ReadingService $readings): Response
    {
        $book->load(['authors', 'currentReading']);
        $reading = $book->currentReading;

        return Inertia::render('book', [
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
            'can_log' => $reading !== null && in_array($reading->status, [ReadingStatus::WantToRead, ReadingStatus::Reading], true),
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

        return to_route('library.index');
    }

    /**
     * @return array<string, mixed>|null
     */
    private function preview(string $isbn): ?array
    {
        $candidate = $this->lookup->findByIsbn($isbn);

        return $candidate === null ? null : BookPresenter::candidates([$candidate])[0];
    }
}
