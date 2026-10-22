<?php

namespace App\Http\Controllers;

use App\Enums\NoteKind;
use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\NotePresenter;
use App\Http\Presenters\ReadingPresenter;
use App\Http\Requests\StoreBookRequest;
use App\Http\Requests\UpdateBookRequest;
use App\Models\Book;
use App\Models\Note;
use App\Models\QueueItem;
use App\Models\Reading;
use App\Services\BookLookup\OpenLibraryProvider;
use App\Services\BookLookupService;
use App\Services\LibraryService;
use App\Services\ReadingService;
use App\Services\UndoService;
use App\Support\Genres;
use App\Support\Isbn;
use App\Support\Toast;
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
     * Add book. `q` (and optional `publisher`) searches the external sources;
     * `work` lists the editions of a work and `isbn` loads the details of an
     * edition for the preview. The last two arrive through partial reloads.
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
            'genres' => Genres::names(),
        ]);
    }

    public function store(StoreBookRequest $request): RedirectResponse
    {
        /** @var array{title: string, subtitle?: string|null, authors?: list<string>, isbn_13?: string|null, isbn_10?: string|null, publisher?: string|null, published_year?: int|null, pages?: int|null, genre?: string|null, description?: string|null, cover_url?: string|null, source?: string|null, status: string} $data */
        $data = $request->validated();

        $book = $this->library->add($data);

        Toast::success(__('Livro adicionado'), $book->title.' · '.mb_strtolower(ReadingStatus::from($data['status'])->label()));

        return to_route('books.show', $book);
    }

    public function show(Request $request, Book $book, ReadingService $readings): Response
    {
        $book->load(['authors', 'currentReading']);
        $reading = $book->currentReading;
        $history = $book->readings()->with('sessions')->orderBy('id')->get();
        $queuePosition = QueueItem::query()->where('book_id', $book->id)->value('position');
        $isbn = Isbn::toIsbn13((string) $request->string('lookup'));

        return Inertia::render('book', [
            'book' => BookPresenter::detail($book),
            'slug' => Str::slug($book->title),
            'statuses' => ReadingStatus::options(),
            'progress' => $reading === null ? null : $readings->progress($reading),
            'sessions' => $reading === null ? [] : $reading->sessions
                ->sortByDesc(fn ($session) => [$session->read_on->toDateString(), $session->id])
                ->map(ReadingPresenter::session(...))
                ->values(),
            // Sessions only go into "want to read" or "reading" books (see ReadingService).
            'can_log' => $reading !== null && in_array($reading->status, [ReadingStatus::WantToRead, ReadingStatus::Reading], true),
            // All readings, from the first to the current, for the Readings tab and the reread.
            'readings' => $history->map(fn (Reading $item, int $index) => ReadingPresenter::history($item, $index + 1, $book->pages))->values(),
            'notes' => fn () => Note::query()
                ->with(['book:id,title', 'tags:id,name'])
                ->where('book_id', $book->id)
                ->latest('updated_at')
                ->get()
                ->map(NotePresenter::card(...))
                ->values(),
            'note_kinds' => NoteKind::options(),
            'queued' => $queuePosition !== null,
            'queue_position' => $queuePosition === null ? null : (int) $queuePosition,
            // What goes with the book if it is removed (confirmation dialog).
            'removal' => [
                'readings' => $history->count(),
                'finished' => $history->where('status', ReadingStatus::Read)->count(),
                'sessions' => $history->sum(fn (Reading $item) => $item->sessions->count()),
                'pages' => $history->sum(fn (Reading $item) => $item->sessions->sum(fn ($session) => $session->pages())),
                'notes' => Note::query()->where('book_id', $book->id)->count(),
            ],
            // Highest page already logged: the page total cannot fall below it.
            'max_logged_page' => (int) $history->flatMap(fn (Reading $item) => $item->sessions)->max('page_to'),
            'genres' => fn () => collect(Genres::names())
                ->merge(Book::query()->whereNotNull('genre')->distinct()->pluck('genre'))
                ->unique()->sort()->values(),
            // "↻ look up" in the edit panel: the source's data to compare, via partial reload.
            'lookup' => Inertia::optional(fn () => $isbn === null ? null : $this->preview($isbn)),
        ]);
    }

    /** Fixes the book's data ("edit data" panel). */
    public function update(UpdateBookRequest $request, Book $book, UndoService $undo): RedirectResponse
    {
        /** @var array{title: string, subtitle?: string|null, authors?: list<string>, isbn_13?: string|null, isbn_10?: string|null, publisher?: string|null, published_year?: int|null, pages?: int|null, genre?: string|null, description?: string|null, cover_url?: string|null} $data */
        $data = $request->validated();
        $pagesBefore = $book->pages;

        $snapshot = $undo->capture([
            UndoService::scope('books', ['id' => $book->id]),
            UndoService::scope('author_book', ['book_id' => $book->id], null),
            UndoService::scope('readings', ['book_id' => $book->id]),
        ]);

        $coverChanged = $this->library->update($book, $data, $request->file('cover_file'), $data['cover_url'] ?? null);

        Toast::success(
            __('Dados atualizados'),
            $this->updateNote($coverChanged, $pagesBefore !== $book->pages),
            null,
            // Replacing the cover overwrites the file: there is no going back.
            $coverChanged ? null : $undo->remember($snapshot),
        );

        return back();
    }

    public function destroy(Book $book): RedirectResponse
    {
        $title = $book->title;
        $this->library->remove($book);

        Toast::success(__(':title removido', ['title' => $title]), __('da biblioteca, com leituras, sessões e notas'));

        return to_route('library.index');
    }

    private function updateNote(bool $coverChanged, bool $pagesChanged): ?string
    {
        if ($coverChanged) {
            return __('capa nova salva');
        }

        if ($pagesChanged) {
            return __('previsão e ritmo recalculados');
        }

        return null;
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
