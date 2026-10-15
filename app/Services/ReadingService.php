<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Models\ReadingSession;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Regras da leitura: as datas de início e fim acompanham a estante,
 * porque as estatísticas contam livros lidos pela data de fim. As sessões
 * mantêm current_page coerente com o que foi registrado.
 */
class ReadingService
{
    private const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    public function __construct(private readonly QueueService $queue) {}

    /**
     * Troca a estante da leitura. Início, página e sessões nunca são apagados aqui:
     * voltar para "quero ler" é uma pausa, e retomar continua de onde parou.
     *
     * Um livro lido não volta para "lendo" ou "quero ler" na mesma leitura: isso
     * vira uma releitura (startReread). Corrigir uma marcação errada é reopen().
     */
    public function changeStatus(Reading $reading, ReadingStatus $status): Reading
    {
        if ($reading->status === $status && $reading->exists) {
            return $reading;
        }

        if ($reading->exists && $reading->status === ReadingStatus::Read) {
            if ($status === ReadingStatus::Abandoned) {
                throw ValidationException::withMessages([
                    'status' => 'Um livro lido não pode ser abandonado. Para relê-lo, use "Ler de novo".',
                ]);
            }

            return $this->startReread($reading->book, $status);
        }

        $today = Carbon::today();
        $reading->status = $status;

        switch ($status) {
            case ReadingStatus::WantToRead:
                $reading->finished_at = null;
                $reading->abandon_reason = null;
                break;

            case ReadingStatus::Reading:
                $reading->started_at ??= $today;
                $reading->finished_at = null;
                $reading->abandon_reason = null;
                break;

            case ReadingStatus::Read:
                $reading->started_at ??= $today;
                $reading->finished_at = $today;
                $reading->current_page = max($reading->current_page, $reading->book->pages ?? 0);
                $reading->abandon_reason = null;
                break;

            case ReadingStatus::Abandoned:
                $reading->started_at ??= $today;
                $reading->finished_at = $today;
                break;
        }

        $reading->save();

        // A fila é do que vem a seguir: começar, terminar ou abandonar tira o livro dela.
        if ($status !== ReadingStatus::WantToRead) {
            $this->queue->removeBook($reading->book);
        }

        return $reading;
    }

    /**
     * Termina a leitura numa data escolhida, com nota e uma linha de resenha opcionais.
     * A linha entra no começo da resenha que já existir.
     */
    public function finish(Reading $reading, Carbon $on, ?int $rating = null, ?string $line = null): Reading
    {
        if ($reading->status === ReadingStatus::Read) {
            throw ValidationException::withMessages(['status' => 'Esta leitura já está terminada.']);
        }

        $this->ensureEndDate($reading, $on, 'finished_on');

        DB::transaction(function () use ($reading, $on, $rating, $line) {
            $first = $reading->sessions()->min('read_on');

            $reading->started_at ??= $first === null ? $on : Carbon::parse($first);
            $reading->status = ReadingStatus::Read;
            $reading->finished_at = $on;
            $reading->current_page = max($reading->current_page, $reading->book->pages ?? 0);
            $reading->abandon_reason = null;

            if ($rating !== null) {
                $reading->rating = $rating;
            }

            $line = $line === null ? '' : trim($line);

            if ($line !== '') {
                $reading->review = $reading->review === null ? $line : $line."\n\n".$reading->review;
            }

            $reading->save();
            $this->queue->removeBook($reading->book);
        });

        return $reading;
    }

    /** Abandona guardando a página e, se informado, o motivo. */
    public function abandon(Reading $reading, ?string $reason = null, ?int $rating = null): Reading
    {
        if ($reading->status === ReadingStatus::Read) {
            throw ValidationException::withMessages([
                'status' => 'Um livro lido não pode ser abandonado. Para relê-lo, use "Ler de novo".',
            ]);
        }

        return DB::transaction(function () use ($reading, $reason, $rating) {
            $this->changeStatus($reading, ReadingStatus::Abandoned);

            $reason = $reason === null ? '' : trim($reason);
            $reading->abandon_reason = $reason === '' ? null : $reason;

            if ($rating !== null) {
                $reading->rating = $rating;
            }

            $reading->save();

            return $reading;
        });
    }

    /**
     * Releitura: uma leitura nova do livro, com sessões, nota e resenha próprias.
     * A anterior fica intacta no histórico. "Quero ler" entra no fim da fila.
     */
    public function startReread(Book $book, ReadingStatus $status): Reading
    {
        if (! in_array($status, [ReadingStatus::Reading, ReadingStatus::WantToRead], true)) {
            throw ValidationException::withMessages(['status' => 'Uma releitura começa em "lendo" ou "quero ler".']);
        }

        if ($book->currentReading?->status !== ReadingStatus::Read) {
            throw ValidationException::withMessages(['status' => 'Só dá para reler um livro que você terminou.']);
        }

        return DB::transaction(function () use ($book, $status) {
            $reading = new Reading([
                'status' => $status,
                'started_at' => $status === ReadingStatus::Reading ? Carbon::today() : null,
            ]);
            $reading->book()->associate($book);
            $reading->save();

            $book->unsetRelation('currentReading');

            if ($status === ReadingStatus::WantToRead) {
                $this->queue->add($book);
            } else {
                $this->queue->removeBook($book);
            }

            return $reading;
        });
    }

    /**
     * "Corrigir: ainda não terminei". O único caminho que apaga a data de término
     * de uma leitura lida: ela volta para "lendo" na página em que estava.
     */
    public function reopen(Reading $reading): Reading
    {
        if ($reading->status !== ReadingStatus::Read) {
            throw ValidationException::withMessages(['status' => 'Só uma leitura terminada pode ser desmarcada.']);
        }

        $reading->status = ReadingStatus::Reading;
        $reading->finished_at = null;
        $reading->save();

        return $reading;
    }

    /**
     * Corrige as datas. Leituras terminadas ou abandonadas têm início e fim;
     * as em andamento, só início. Sessões fora do período são permitidas: a tela avisa.
     */
    public function updateDates(Reading $reading, Carbon $start, ?Carbon $end): void
    {
        if ($start->greaterThan(Carbon::today())) {
            throw ValidationException::withMessages(['started_at' => 'O início não pode ser depois de hoje.']);
        }

        $closed = in_array($reading->status, [ReadingStatus::Read, ReadingStatus::Abandoned], true);

        if ($closed) {
            if ($end === null) {
                throw ValidationException::withMessages(['finished_at' => 'Informe o término.']);
            }

            if ($end->lessThan($start)) {
                throw ValidationException::withMessages(['finished_at' => 'O término não pode ser antes do início.']);
            }

            $this->ensureEndDate($reading, $end, 'finished_at');
        }

        $reading->started_at = $start;
        $reading->finished_at = $closed ? $end : null;
        $reading->save();
    }

    /** Apaga uma leitura do histórico. A única leitura de um livro não sai: remova o livro. */
    public function deleteReading(Reading $reading): void
    {
        if ($reading->book->readings()->count() <= 1) {
            throw ValidationException::withMessages([
                'reading' => 'Esta é a única leitura do livro. Para apagá-la, remova o livro da biblioteca.',
            ]);
        }

        $reading->delete();
    }

    /** Número da leitura entre as do livro: 1 para a primeira, 2 para a releitura… */
    public function ordinal(Reading $reading): int
    {
        return Reading::query()
            ->where('book_id', $reading->book_id)
            ->where('id', '<=', $reading->id)
            ->count();
    }

    /** Leitura mais recente do livro; cria uma em "quero ler" se não houver nenhuma. */
    public function readingFor(Book $book): Reading
    {
        $reading = $book->currentReading;

        if ($reading === null) {
            $reading = new Reading(['status' => ReadingStatus::WantToRead]);
            $reading->book()->associate($book);
            // Salva já: a sessão precisa de uma leitura com id.
            $reading->save();
        }

        return $reading;
    }

    /**
     * Registra o que foi lido: a página em que você parou, com minutos opcionais.
     * A página inicial é deduzida de current_page + 1. Só avança: para corrigir
     * um registro, edite a sessão.
     *
     * Decisões: sessões só entram em livros "quero ler" ou "lendo" (o primeiro
     * vira "lendo" sozinho). Livros lidos ou abandonados precisam voltar para
     * "lendo" antes, para não reabrir uma leitura sem querer.
     */
    public function registerSession(Reading $reading, int $pageTo, ?int $minutes, Carbon $readOn): ReadingSession
    {
        if (! in_array($reading->status, [ReadingStatus::WantToRead, ReadingStatus::Reading], true)) {
            throw ValidationException::withMessages([
                'status' => 'Mude a estante para "Lendo" para registrar sessões.',
            ]);
        }

        $this->ensureWithinBook($reading, $pageTo);

        if ($pageTo <= $reading->current_page) {
            throw ValidationException::withMessages([
                'page_to' => "Informe uma página depois da pág. {$reading->current_page}.",
            ]);
        }

        return DB::transaction(function () use ($reading, $pageTo, $minutes, $readOn) {
            $session = $reading->sessions()->create([
                'read_on' => $readOn->toDateString(),
                'page_from' => $reading->current_page + 1,
                'page_to' => $pageTo,
                'minutes' => $minutes,
            ]);

            $reading->current_page = $pageTo;

            // changeStatus já salva a leitura; sem a troca de estante, salva aqui.
            if ($reading->status === ReadingStatus::WantToRead) {
                $this->changeStatus($reading, ReadingStatus::Reading);
            } else {
                $reading->save();
            }

            return $session;
        });
    }

    /**
     * Corrige uma sessão. A página inicial fica como foi registrada, porque
     * as sessões seguintes continuam a partir dela.
     */
    public function updateSession(ReadingSession $session, Carbon $readOn, int $pageTo, ?int $minutes): void
    {
        $reading = $session->reading;

        if ($pageTo < $session->page_from) {
            throw ValidationException::withMessages([
                'page_to' => "Use uma página a partir da {$session->page_from}.",
            ]);
        }

        $this->ensureWithinBook($reading, $pageTo);

        DB::transaction(function () use ($session, $reading, $readOn, $pageTo, $minutes) {
            $wasLast = $session->page_to === $reading->current_page;

            $session->update([
                'read_on' => $readOn->toDateString(),
                'page_to' => $pageTo,
                'minutes' => $minutes,
            ]);

            if ($wasLast) {
                $this->syncCurrentPage($reading);
            }
        });
    }

    /**
     * Apaga uma sessão. current_page só volta se a sessão apagada era a última
     * registrada. Uma marcação manual (ex.: "lido") não é desfeita por isso.
     */
    public function deleteSession(ReadingSession $session): void
    {
        $reading = $session->reading;
        $wasLast = $session->page_to === $reading->current_page;

        DB::transaction(function () use ($session, $reading, $wasLast) {
            $session->delete();

            if ($wasLast) {
                $this->syncCurrentPage($reading);
            }
        });
    }

    /**
     * Progresso para as telas: página, percentual, ritmo e previsão de dias.
     *
     * O ritmo é páginas por dia em que houve leitura, o mesmo critério da
     * média de dias lidos da estatística. Sem sessões, não há previsão.
     *
     * @return array{current_page: int, pages: int|null, percent: int|null, pace: float|null, days_left: int|null, finish_suggested: bool}
     */
    public function progress(Reading $reading): array
    {
        $pages = $reading->book->pages;
        $current = $reading->current_page;

        $totals = $reading->sessions()
            ->toBase()
            ->selectRaw('count(distinct date(read_on)) as days, sum(page_to - page_from + 1) as pages_read')
            ->first();

        $days = (int) ($totals->days ?? 0);
        $pace = $days > 0 ? (int) ($totals->pages_read ?? 0) / $days : null;
        $remaining = $pages === null ? null : $pages - $current;

        return [
            'current_page' => $current,
            'pages' => $pages,
            'percent' => $pages !== null && $pages > 0 ? min(100, (int) round($current / $pages * 100)) : null,
            'pace' => $pace === null ? null : round($pace, 1),
            'days_left' => $remaining !== null && $remaining > 0 && $pace !== null && $pace > 0
                ? (int) ceil($remaining / $pace)
                : null,
            // Chegou à última página: a tela oferece marcar como lido, sem mudar nada sozinha.
            'finish_suggested' => $reading->status === ReadingStatus::Reading && $pages !== null && $current >= $pages,
        ];
    }

    /**
     * Término válido: não depois de hoje, não antes do início nem da última sessão.
     */
    private function ensureEndDate(Reading $reading, Carbon $end, string $field): void
    {
        if ($end->greaterThan(Carbon::today())) {
            throw ValidationException::withMessages([$field => 'O término não pode ser depois de hoje.']);
        }

        if ($reading->started_at !== null && $end->lessThan($reading->started_at) && $field === 'finished_on') {
            throw ValidationException::withMessages([
                $field => 'A leitura começou em '.self::shortDate($reading->started_at).'. Escolha essa data ou depois.',
            ]);
        }

        $last = $reading->sessions()->max('read_on');

        if ($last !== null && $end->lessThan(Carbon::parse($last)->startOfDay())) {
            throw ValidationException::withMessages([
                $field => 'A última sessão foi em '.self::shortDate(Carbon::parse($last)).'. Escolha essa data ou depois.',
            ]);
        }
    }

    /** "14 out". */
    public static function shortDate(CarbonInterface $date): string
    {
        return $date->day.' '.self::MONTHS[$date->month - 1];
    }

    /** "out 2026". */
    public static function monthLabel(CarbonInterface $date): string
    {
        return self::MONTHS[$date->month - 1].' '.$date->year;
    }

    private function ensureWithinBook(Reading $reading, int $pageTo): void
    {
        $pages = $reading->book->pages;

        if ($pages !== null && $pageTo > $pages) {
            throw ValidationException::withMessages([
                'page_to' => "O livro tem {$pages} páginas.",
            ]);
        }
    }

    /** Recalcula current_page pela maior página registrada, se ainda houver sessões. */
    private function syncCurrentPage(Reading $reading): void
    {
        $last = $reading->sessions()->max('page_to');

        if ($last !== null) {
            $reading->current_page = (int) $last;
            $reading->save();
        }
    }
}
