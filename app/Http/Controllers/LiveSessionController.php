<?php

namespace App\Http\Controllers;

use App\Http\Presenters\LiveSessionPresenter;
use App\Http\Presenters\ReadingPresenter;
use App\Http\Requests\FinishLiveSessionRequest;
use App\Http\Requests\MoveSessionPageRequest;
use App\Models\Book;
use App\Services\DashboardService;
use App\Services\ReadingActivity;
use App\Services\ReadingService;
use App\Services\ReadingTimer;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Full-screen reading session: the timer, the page where the reader is and the day's numbers.
 * It drives the same timer as the menu bar window, which keeps counting while this screen is closed.
 */
class LiveSessionController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboard,
        private readonly ReadingActivity $activity,
        private readonly ReadingService $readings,
        private readonly ReadingTimer $timer,
    ) {}

    public function show(): Response|RedirectResponse
    {
        $timer = $this->timer->current();

        if ($timer === null) {
            return to_route('home');
        }

        $today = Carbon::today();
        $book = Book::query()->with('authors')->findOrFail($timer['book_id']);
        $reading = $this->readings->readingFor($book);

        return Inertia::render('live-session', [
            'reading' => ReadingPresenter::summary($reading, $this->readings),
            'timer' => LiveSessionPresenter::timer($timer, $this->timer),
            'pages_per_hour' => $this->readings->pagesPerHour($reading),
            'today' => [
                'pages' => $this->activity->pagesOn($today),
                'average' => $this->activity->averagePagesPerReadingDay(),
                'goal' => $this->dashboard->dailyGoal(),
            ],
            'week' => $this->activity->lastWeekLevels($today),
            'streak' => $this->dashboard->streak($today),
        ]);
    }

    /** Opens the screen for the book; a timer already running on that book is simply resumed on screen. */
    public function start(Book $book): RedirectResponse
    {
        $timer = $this->timer->current();

        if ($timer !== null && $timer['book_id'] !== $book->id) {
            Toast::error(
                __('Já existe uma sessão em andamento em outro livro'),
                __('Termine ou descarte a sessão atual primeiro.'),
                ['label' => __('Abrir sessão'), 'method' => 'get', 'url' => route('live-session.show', absolute: false)],
            );

            return back();
        }

        if ($timer === null) {
            $this->timer->start($book, $this->readings->readingFor($book)->current_page);
        }

        return to_route('live-session.show');
    }

    public function movePage(MoveSessionPageRequest $request): RedirectResponse
    {
        $this->timer->movePage($request->integer('page'));

        return back();
    }

    public function pause(): RedirectResponse
    {
        $this->timer->pause();

        return back();
    }

    public function resume(): RedirectResponse
    {
        $this->timer->resume();

        return back();
    }

    /** Saves the session up to the page on screen; on the last page the reader may also finish the book. */
    public function finish(FinishLiveSessionRequest $request): RedirectResponse
    {
        $timer = $this->timer->current();

        if ($timer === null) {
            return to_route('home');
        }

        $session = $this->timer->finish($timer['page']);

        if ($session === null) {
            return to_route('home');
        }

        $reading = $session->reading;
        $shouldFinishBook = $request->boolean('finish_book')
            && $reading->book->pages !== null
            && $session->page_to >= $reading->book->pages;

        if ($shouldFinishBook) {
            $this->readings->finish($reading, Carbon::today());
        }

        $data = ReadingPresenter::session($session);
        Toast::success($shouldFinishBook ? __(':title marcado como lido', ['title' => $reading->book->title]) : __('Sessão registrada'), "{$data['hash']} · ".__('p. :page', ['page' => "{$session->page_from} → {$session->page_to}"]).' · '.__('+:pages págs', ['pages' => $data['pages']]));

        return to_route('books.show', $session->reading->book_id);
    }

    /** Drops the session without saving anything and goes back to the book. */
    public function discard(): RedirectResponse
    {
        $timer = $this->timer->current();

        if ($timer === null) {
            return to_route('home');
        }

        $this->timer->discard();
        Toast::success(__('Sessão descartada'));

        return to_route('books.show', $timer['book_id']);
    }
}
