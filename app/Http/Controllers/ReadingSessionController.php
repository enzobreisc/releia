<?php

namespace App\Http\Controllers;

use App\Http\Presenters\ReadingPresenter;
use App\Http\Requests\StoreSessionRequest;
use App\Http\Requests\UpdateSessionRequest;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Services\ReadingService;
use App\Services\UndoService;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;

class ReadingSessionController extends Controller
{
    public function __construct(private readonly ReadingService $readings) {}

    /** Registra o progresso de hoje no livro. */
    public function store(StoreSessionRequest $request, Book $book): RedirectResponse
    {
        $session = $this->readings->registerSession(
            $this->readings->readingFor($book),
            $request->integer('page_to'),
            $request->integer('minutes') ?: null,
            Carbon::today(),
        );

        $data = ReadingPresenter::session($session);
        Toast::success('Sessão registrada', "{$data['hash']} · p. {$session->page_from} → {$session->page_to} · +{$data['pages']} págs");

        return back();
    }

    public function update(UpdateSessionRequest $request, ReadingSession $session): RedirectResponse
    {
        $this->readings->updateSession(
            $session,
            Carbon::createFromFormat('Y-m-d', $request->string('read_on')->toString())->startOfDay(),
            $request->integer('page_to'),
            $request->integer('minutes') ?: null,
        );

        Toast::success('Sessão corrigida', ReadingPresenter::session($session)['hash']);

        return back();
    }

    public function destroy(ReadingSession $session, UndoService $undo): RedirectResponse
    {
        $snapshot = $undo->capture([
            UndoService::scope('reading_sessions', ['id' => $session->id]),
            UndoService::scope('readings', ['id' => $session->reading_id]),
        ]);
        $data = ReadingPresenter::session($session);

        $this->readings->deleteSession($session);

        Toast::success('Sessão apagada', "{$data['hash']} · p. {$session->page_from} → {$session->page_to} · progresso recalculado", null, $undo->remember($snapshot));

        return back();
    }
}
