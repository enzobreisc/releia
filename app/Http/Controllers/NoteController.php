<?php

namespace App\Http\Controllers;

use App\Http\Requests\NoteRequest;
use App\Models\Note;
use App\Services\NoteService;
use App\Services\UndoService;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;

/** Notes are written from each book's page, so every action returns there. */
class NoteController extends Controller
{
    public function __construct(private readonly NoteService $notes) {}

    public function store(NoteRequest $request): RedirectResponse
    {
        $note = $this->notes->create($request->payload());

        Toast::success(__('Nota criada'), $this->where($note));

        return back();
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
        $where = $this->where($note);

        $this->notes->delete($note);

        Toast::success(__('Nota excluída'), $where, null, $undo->remember($snapshot));

        return back();
    }

    /** "Book title · p. 42", the notice's second line. */
    private function where(Note $note): string
    {
        return $note->book->title.($note->page === null ? '' : ' · '.__('p. :page', ['page' => $note->page]));
    }
}
