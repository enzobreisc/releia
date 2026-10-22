<?php

namespace App\Http\Controllers;

use App\Enums\NoteKind;
use App\Http\Presenters\NotePresenter;
use App\Http\Requests\NoteRequest;
use App\Models\Book;
use App\Models\Note;
use App\Models\Tag;
use App\Services\NoteReviewService;
use App\Services\NoteService;
use App\Services\UndoService;
use App\Support\Toast;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class NoteController extends Controller
{
    public function __construct(
        private readonly NoteService $notes,
        private readonly NoteReviewService $reviews,
    ) {}

    /**
     * List with filters, note selected in the editor (?note=) and new note mode (?new=1).
     */
    public function index(Request $request): Response
    {
        $search = Book::normalizeSearch((string) $request->string('q'));
        $bookId = $request->integer('book') ?: null;
        $kind = NoteKind::tryFrom($request->string('kind')->toString());
        $tag = Str::of((string) $request->string('tag'))->ltrim('#')->ascii()->lower()->toString();
        $selectedId = $request->integer('note') ?: null;
        $today = Carbon::today();

        $notes = Note::query()
            ->with(['book:id,title', 'tags:id,name'])
            ->when($search !== '', function (Builder $query) use ($search) {
                foreach (explode(' ', $search) as $term) {
                    $query->where('search_text', 'like', '%'.$term.'%');
                }
            })
            ->when($bookId, fn (Builder $query, int $bookId) => $query->where('book_id', $bookId))
            ->when($kind, fn (Builder $query, NoteKind $kind) => $query->where('kind', $kind->value))
            ->when($tag !== '', fn (Builder $query) => $query->whereHas('tags', fn (Builder $tags) => $tags->where('name', $tag)))
            ->latest('updated_at')
            ->latest('id')
            ->get();

        $due = $this->reviews->dueOn($today)
            ->with(['book:id,title', 'tags:id,name'])
            ->orderBy('next_review_at')
            ->orderBy('id')
            ->get();

        $selected = $selectedId === null ? null : Note::query()->with(['book:id,title', 'tags:id,name'])->find($selectedId);

        return Inertia::render('notes', [
            'notes' => $notes->map(NotePresenter::card(...))->values(),
            'selected' => $selected === null ? null : NotePresenter::card($selected),
            'creating' => $request->boolean('new'),
            'books' => Book::query()->orderBy('title')->get(['id', 'title'])
                ->map(fn (Book $book) => ['id' => $book->id, 'title' => $book->title])->values(),
            'kinds' => NoteKind::options(),
            'kind_counts' => Note::query()->select('kind', DB::raw('count(*) as total'))->groupBy('kind')
                ->pluck('total', 'kind'),
            'tags' => Tag::query()->whereHas('notes')->withCount('notes')->orderBy('name')->get()
                ->map(fn (Tag $tag) => ['name' => $tag->name, 'count' => $tag->notes_count])->values(),
            'review' => [
                'count' => $due->count(),
                'books' => $due->pluck('book_id')->unique()->count(),
                'notes' => $due->map(NotePresenter::card(...))->values(),
            ],
            'filters' => [
                'q' => (string) $request->string('q'),
                'book' => $bookId,
                'kind' => $kind?->value,
                'tag' => $tag === '' ? null : $tag,
            ],
        ]);
    }

    public function store(NoteRequest $request): RedirectResponse
    {
        $note = $this->notes->create($request->payload());

        Toast::success(__('Nota criada'), $note->book->title.($note->page === null ? '' : ' · '.__('p. :page', ['page' => $note->page])));

        return to_route('notes.index', ['note' => $note->id]);
    }

    public function update(NoteRequest $request, Note $note): RedirectResponse
    {
        $this->notes->update($note, $request->payload());

        Toast::success(__('Nota salva'));

        return back();
    }

    public function destroy(Note $note, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([
            UndoService::scope('notes', ['id' => $note->id]),
            UndoService::scope('note_tag', ['note_id' => $note->id], null),
        ]);
        $where = $note->book->title.($note->page === null ? '' : ' · '.__('p. :page', ['page' => $note->page]));

        $this->notes->delete($note);

        Toast::success(__('Nota excluída'), $where, null, $undo->remember($snapshot));

        // Deleted from the book detail page, stay there; from the Notes screen, the editor closes.
        return str_contains(url()->previous(), '/library/') ? back() : to_route('notes.index');
    }

    /** Marks the note as reviewed today and reschedules it. */
    public function review(Note $note): RedirectResponse
    {
        $this->reviews->markReviewed($note, Carbon::today());

        return back();
    }
}
