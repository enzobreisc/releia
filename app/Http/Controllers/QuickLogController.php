<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Enums\TimerState;
use App\Http\Presenters\ReadingPresenter;
use App\Http\Requests\QuickLogRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\ReadingSession;
use App\Native\QuickLog;
use App\Services\DashboardService;
use App\Services\ReadingActivity;
use App\Services\ReadingService;
use App\Services\ReadingTimer;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Leitura do dia, na janela da barra de menu: escolher o livro, contar o
 * tempo com o timer e registrar a página final.
 */
class QuickLogController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboard,
        private readonly ReadingService $readings,
        private readonly ReadingTimer $timer,
    ) {}

    public function show(Request $request, ReadingActivity $activity): Response
    {
        $today = Carbon::today();
        $timer = $this->timer->current();

        return Inertia::render('quick-log', [
            'readings' => $this->dashboard->readingNow(),
            // Livros em "quero ler", para começar um por aqui.
            'available' => Book::query()
                ->whereHas('currentReading', fn ($query) => $query->where('status', ReadingStatus::WantToRead->value))
                ->orderByRaw('title COLLATE NOCASE')
                ->get(['id', 'title'])
                ->map(fn (Book $book) => ['id' => $book->id, 'title' => $book->title])
                ->values(),
            'timer' => $timer === null ? null : [
                'book_id' => $timer['book_id'],
                'start_page' => $timer['start_page'],
                'elapsed' => $this->timer->elapsedSeconds($timer),
                'paused' => $timer['paused_at'] !== null,
            ],
            'week' => $activity->lastWeekLevels($today),
            'streak' => $this->dashboard->streak($today),
            'shortcut' => QuickLog::shortcut(),
            // Resumo da sessão que acabou de ser salva (uma vez só).
            'saved' => $request->session()->get('quick_log_saved'),
        ]);
    }

    /** Registro sem timer: página final e minutos digitados. */
    public function store(QuickLogRequest $request): RedirectResponse
    {
        $book = Book::query()->findOrFail($request->integer('book_id'));

        $session = $this->readings->registerSession(
            $this->readings->readingFor($book),
            $request->integer('page_to'),
            $request->integer('minutes') ?: null,
            Carbon::today(),
        );

        $this->flashSaved($request, $session);

        return to_route('quick-log');
    }

    /** Começa o timer num livro, a partir da página em que você está. */
    public function start(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
            'start_page' => ['required', 'integer', 'between:0,20000'],
        ]);

        $this->timer->start(Book::query()->whereKey($data['book_id'])->firstOrFail(), (int) $data['start_page']);

        return to_route('quick-log');
    }

    /** Timer for the phone lock screen widget, which counts on its own from `counting_since`. */
    public function status(): JsonResponse
    {
        $timer = $this->timer->current();

        if ($timer === null) {
            return response()->json([
                'state' => TimerState::Idle,
                'reading' => $this->dashboard->sidebarCard(Carbon::today()),
            ]);
        }

        $elapsed = $this->timer->elapsedSeconds($timer);

        return response()->json([
            'state' => $timer['paused_at'] === null ? TimerState::Reading : TimerState::Paused,
            'title' => Book::query()->whereKey($timer['book_id'])->value('title'),
            'start_page' => $timer['start_page'],
            'elapsed' => $elapsed,
            'counting_since' => CarbonImmutable::now()->subSeconds($elapsed)->toIso8601String(),
        ]);
    }

    public function pause(): RedirectResponse
    {
        $this->timer->pause();

        return to_route('quick-log');
    }

    public function resume(): RedirectResponse
    {
        $this->timer->resume();

        return to_route('quick-log');
    }

    /** Para o timer e salva a sessão com a página final. */
    public function finish(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'page_to' => ['required', 'integer', 'between:1,20000'],
        ]);

        $session = $this->timer->finish((int) $data['page_to']);

        if ($session !== null) {
            $this->flashSaved($request, $session);
        }

        return to_route('quick-log');
    }

    /**
     * Resumo para a tela "feito". Se a sessão chegou à última página, o livro
     * termina aqui mesmo (data de hoje) e a tela oferece a nota e o próximo da fila.
     */
    private function flashSaved(Request $request, ReadingSession $session): void
    {
        $reading = $session->reading;
        $book = $reading->book;
        $finished = $book->pages !== null && $session->page_to >= $book->pages;

        if ($finished) {
            $this->readings->finish($reading, Carbon::today());
        }

        $next = $finished ? QueueItem::query()->with('book')->orderBy('position')->first()?->book : null;

        $request->session()->flash('quick_log_saved', [
            ...ReadingPresenter::session($session),
            'title' => $book->title,
            'book_id' => $book->id,
            'streak' => $this->dashboard->streak(Carbon::today()),
            'finished' => $finished,
            'days' => $finished && $reading->started_at !== null && $reading->finished_at !== null ? (int) $reading->started_at->diffInDays($reading->finished_at) + 1 : null,
            'next' => $next === null ? null : ['id' => $next->id, 'title' => $next->title],
        ]);
    }

    public function discard(): RedirectResponse
    {
        $this->timer->discard();

        return to_route('quick-log');
    }

    /** Passa um livro de "quero ler" para "lendo", para aparecer na leitura do dia. */
    public function startBook(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'book_id' => ['required', 'integer', 'exists:books,id'],
        ]);

        $book = Book::query()->whereKey($data['book_id'])->firstOrFail();
        $this->readings->changeStatus($this->readings->readingFor($book), ReadingStatus::Reading);

        return to_route('quick-log');
    }
}
