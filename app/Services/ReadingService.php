<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Models\ReadingSession;
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
    public function changeStatus(Reading $reading, ReadingStatus $status): void
    {
        if ($reading->status === $status && $reading->exists) {
            return;
        }

        $today = Carbon::today();
        $reading->status = $status;

        switch ($status) {
            case ReadingStatus::WantToRead:
                $reading->started_at = null;
                $reading->finished_at = null;
                break;

            case ReadingStatus::Reading:
                $reading->started_at ??= $today;
                $reading->finished_at = null;
                break;

            case ReadingStatus::Read:
                $reading->started_at ??= $today;
                $reading->finished_at = $today;
                $reading->current_page = max($reading->current_page, $reading->book->pages ?? 0);
                break;

            case ReadingStatus::Abandoned:
                $reading->started_at ??= $today;
                $reading->finished_at = $today;
                break;
        }

        $reading->save();
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
