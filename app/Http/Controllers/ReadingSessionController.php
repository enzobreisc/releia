<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSessionRequest;
use App\Http\Requests\UpdateSessionRequest;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Services\ReadingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;

class ReadingSessionController extends Controller
{
    public function __construct(private readonly ReadingService $readings) {}

    /** Registra o progresso de hoje no livro. */
    public function store(StoreSessionRequest $request, Book $book): RedirectResponse
    {
        $this->readings->registerSession(
            $this->readings->readingFor($book),
            $request->integer('page_to'),
            $request->integer('minutes') ?: null,
            Carbon::today(),
        );

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

        return back();
    }

    public function destroy(ReadingSession $session): RedirectResponse
    {
        $this->readings->deleteSession($session);

        return back();
    }
}
