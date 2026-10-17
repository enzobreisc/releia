<?php

namespace App\Http\Controllers;

use App\Enums\ReadingStatus;
use App\Http\Requests\UpdateReadingRequest;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\Reading;
use App\Services\DashboardService;
use App\Services\ReadingService;
use App\Services\UndoService;
use App\Support\Toast;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * @phpstan-import-type Snapshot from UndoService
 *
 * Estante, nota, resenha e o ciclo de cada leitura: começar, terminar,
 * abandonar, reler, corrigir e mudar datas. Toda mudança responde com um aviso,
 * quase sempre com desfazer.
 */
class ReadingController extends Controller
{
    public function __construct(
        private readonly ReadingService $readings,
        private readonly UndoService $undo,
    ) {}

    /** Nota, resenha e trocas de estante simples, na leitura mais recente do livro. */
    public function update(UpdateReadingRequest $request, Book $book): RedirectResponse
    {
        $reading = $book->currentReading;

        if ($reading === null) {
            $reading = new Reading(['status' => ReadingStatus::WantToRead]);
            $reading->book()->associate($book);
        }

        if ($request->has('rating')) {
            $reading->rating = $request->integer('rating') ?: null;
        }

        if ($request->has('review')) {
            $review = trim((string) $request->string('review'));
            $reading->review = $review === '' ? null : $review;
        }

        if (! $request->has('status')) {
            $reading->save();

            if ($request->has('review')) {
                Toast::success('Resenha salva', $this->ordinalLabel($reading));
            } else {
                // A nota muda sem aviso, mas o desfazer anterior já não vale.
                $this->undo->forget();
            }

            return back();
        }

        $status = $request->enum('status', ReadingStatus::class) ?? $reading->status;
        $before = $reading->exists ? $reading->status : null;
        $snapshot = $this->captureBook($book);
        $wasQueued = QueueItem::query()->where('book_id', $book->id)->exists();

        $reading = $this->readings->changeStatus($reading, $status);
        $token = $this->undo->remember($snapshot);

        $this->statusToast($book, $reading, $before, $wasQueued, $token);

        return back();
    }

    /** "Começar" de fora do Detalhe (fila, aviso de término): passa para lendo e abre o livro. */
    public function start(Book $book): RedirectResponse
    {
        $snapshot = $this->captureBook($book);
        $wasQueued = QueueItem::query()->where('book_id', $book->id)->exists();
        $reading = $this->readings->readingFor($book);
        $before = $reading->status;

        $reading = $this->readings->changeStatus($reading, ReadingStatus::Reading);
        $this->statusToast($book, $reading, $before, $wasQueued, $this->undo->remember($snapshot));

        return to_route('books.show', $book);
    }

    /** Terminar e avaliar: data (ou "sem data"), nota e uma linha. */
    public function finish(Request $request, Reading $reading, DashboardService $dashboard): RedirectResponse
    {
        $data = $request->validate([
            'undated' => ['boolean'],
            'finished_on' => ['required_without:undated', 'nullable', 'date_format:Y-m-d'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'line' => ['nullable', 'string', 'max:280'],
        ]);

        $book = $reading->book;
        $snapshot = $this->captureBook($book);

        $this->readings->finish(
            $reading,
            ($data['undated'] ?? false) || empty($data['finished_on']) ? null : Carbon::createFromFormat('Y-m-d', $data['finished_on'])->startOfDay(),
            isset($data['rating']) ? (int) $data['rating'] : null,
            $data['line'] ?? null,
        );

        $goal = $dashboard->yearGoal(Carbon::today());
        $next = QueueItem::query()->with('book')->orderBy('position')->first()?->book;

        $sub = match (true) {
            $goal['goal'] !== null && $goal['finished'] === $goal['goal'] && $reading->finished_at?->year === $goal['year'] => "Meta de {$goal['year']} batida: {$goal['finished']} de {$goal['goal']}",
            $next !== null => "próximo da fila: {$next->title}",
            default => 'a fila está vazia',
        };

        Toast::success(
            "{$book->title} marcado como lido",
            $sub,
            $next !== null
                ? ['label' => "Começar {$next->title}", 'method' => 'post', 'url' => route('books.start', $next, absolute: false)]
                : ['label' => 'Escolher o próximo', 'method' => 'get', 'url' => route('queue.index', absolute: false)],
            $this->undo->remember($snapshot),
        );

        return back();
    }

    public function abandon(Request $request, Reading $reading): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:120'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
        ]);

        $snapshot = $this->captureBook($reading->book);
        $this->readings->abandon($reading, $data['reason'] ?? null, isset($data['rating']) ? (int) $data['rating'] : null);

        Toast::success(
            "Abandonado na p. {$reading->current_page}",
            $reading->abandon_reason === null ? 'sem motivo' : "motivo: {$reading->abandon_reason}",
            null,
            $this->undo->remember($snapshot),
        );

        return back();
    }

    /** Ler de novo: hoje (lendo) ou depois (quero ler, no fim da fila). */
    public function reread(Request $request, Book $book): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([ReadingStatus::Reading->value, ReadingStatus::WantToRead->value])],
        ]);

        $snapshot = $this->captureBook($book);
        $reading = $this->readings->startReread($book, ReadingStatus::from($data['status']));
        $number = $this->readings->ordinal($reading);
        $token = $this->undo->remember($snapshot);

        if ($reading->status === ReadingStatus::Reading) {
            Toast::success("{$number}ª leitura começou", 'a anterior está na aba Leituras', null, $token);
        } else {
            Toast::success('Quero reler', 'nova leitura · entrou em '.$this->queuePosition($book).' na fila · a anterior continua no histórico', null, $token);
        }

        return back();
    }

    /** Corrigir: desmarca como lido e apaga a data de término. */
    public function reopen(Reading $reading): RedirectResponse
    {
        $snapshot = $this->captureBook($reading->book);
        $this->readings->reopen($reading);

        Toast::success(
            'Desmarcado como lido',
            "a leitura voltou para Lendo na p. {$reading->current_page}",
            null,
            $this->undo->remember($snapshot),
        );

        return back();
    }

    public function dates(Request $request, Reading $reading): RedirectResponse
    {
        $data = $request->validate([
            'started_at' => ['nullable', 'date_format:Y-m-d'],
            'finished_at' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $snapshot = $this->undo->capture([UndoService::scope('readings', ['id' => $reading->id])]);

        $this->readings->updateDates(
            $reading,
            isset($data['started_at']) ? Carbon::createFromFormat('Y-m-d', $data['started_at'])->startOfDay() : null,
            isset($data['finished_at']) ? Carbon::createFromFormat('Y-m-d', $data['finished_at'])->startOfDay() : null,
        );

        $month = $reading->finished_at ?? $reading->started_at ?? Carbon::today();

        Toast::success(
            'Datas salvas',
            'estatísticas de '.ReadingService::monthLabel($month).' atualizadas',
            null,
            $this->undo->remember($snapshot),
        );

        return back();
    }

    /** Apaga uma leitura do histórico (com as sessões dela). */
    public function destroy(Reading $reading): RedirectResponse
    {
        $book = $reading->book;
        $label = $this->ordinalLabel($reading);
        $snapshot = $this->undo->capture([
            UndoService::scope('readings', ['book_id' => $book->id]),
            UndoService::scope('reading_sessions', ['reading_id' => $reading->id]),
        ]);

        $this->readings->deleteReading($reading);

        Toast::success('Leitura apagada', "{$label} de {$book->title}", null, $this->undo->remember($snapshot));

        return back();
    }

    /**
     * Foto do que uma troca de estante pode mexer: as leituras do livro (releituras
     * criam uma nova) e a fila inteira (posições se reorganizam).
     *
     * @return Snapshot
     */
    private function captureBook(Book $book): array
    {
        return $this->undo->capture([
            UndoService::scope('readings', ['book_id' => $book->id]),
            UndoService::scope('queue_items'),
        ]);
    }

    private function statusToast(Book $book, Reading $reading, ?ReadingStatus $before, bool $wasQueued, string $token): void
    {
        $page = $reading->current_page;

        // Releitura: changeStatus devolveu uma leitura nova.
        if ($before === ReadingStatus::Read) {
            $number = $this->readings->ordinal($reading).'ª';

            if ($reading->status === ReadingStatus::Reading) {
                Toast::success("{$number} leitura começou", 'a anterior está na aba Leituras', null, $token);
            } else {
                Toast::success('Quero reler', 'nova leitura · entrou em '.$this->queuePosition($book).' na fila · a anterior continua no histórico', null, $token);
            }

            return;
        }

        match ($reading->status) {
            ReadingStatus::Reading => $before === ReadingStatus::Abandoned
                ? Toast::success('Leitura retomada', "continua da p. {$page}", null, $token)
                : Toast::success('Começou a ler', ($wasQueued ? 'saiu da fila · ' : '').'início: '.ReadingService::shortDate($reading->started_at ?? Carbon::today()), null, $token),
            ReadingStatus::WantToRead => Toast::success(
                'Movido para Quero ler',
                $page > 0 ? "a p. {$page} fica guardada; ao voltar, continua dela" : null,
                QueueItem::query()->where('book_id', $book->id)->exists()
                    ? null
                    : ['label' => 'Pôr na fila', 'method' => 'post', 'url' => route('queue.store', absolute: false), 'data' => ['book_id' => $book->id]],
                $token,
            ),
            ReadingStatus::Read => Toast::success("{$book->title} marcado como lido", null, null, $token),
            ReadingStatus::Abandoned => Toast::success("Abandonado na p. {$page}", null, null, $token),
        };
    }

    private function queuePosition(Book $book): string
    {
        $position = QueueItem::query()->where('book_id', $book->id)->value('position');

        return Toast::ordinal((int) $position);
    }

    private function ordinalLabel(Reading $reading): string
    {
        return ($reading->exists ? $this->readings->ordinal($reading) : 1).'ª leitura';
    }
}
