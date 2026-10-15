<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Models\Setting;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Timer da leitura do dia (janela da barra de menu). Fica em settings, e não na
 * janela, para continuar contando com a janela fechada ou o app reaberto.
 * Só existe um timer por vez.
 *
 * @phpstan-type TimerState array{book_id: int, start_page: int, started_at: string, paused_at: string|null, paused_seconds: int}
 */
class ReadingTimer
{
    private const SETTING = 'reading_timer';

    public function __construct(private readonly ReadingService $readings) {}

    /**
     * @return TimerState|null
     */
    public function current(): ?array
    {
        $timer = Setting::get(self::SETTING);

        if (! is_array($timer) || ! isset($timer['book_id'], $timer['started_at'])) {
            return null;
        }

        /** @var TimerState $timer */
        return $timer;
    }

    /**
     * Começa a contar. A página inicial é a última lida; se for maior que a
     * registrada, o livro avança até ela ao salvar (páginas lidas sem registro).
     */
    public function start(Book $book, int $startPage): void
    {
        $reading = $this->readings->readingFor($book);
        $pages = $book->pages;

        if ($startPage < $reading->current_page) {
            throw ValidationException::withMessages([
                'start_page' => "Você já registrou até a pág. {$reading->current_page}.",
            ]);
        }

        if ($pages !== null && $startPage >= $pages) {
            throw ValidationException::withMessages([
                'start_page' => "O livro tem {$pages} páginas.",
            ]);
        }

        if ($reading->status === ReadingStatus::WantToRead) {
            $this->readings->changeStatus($reading, ReadingStatus::Reading);
        }

        Setting::put(self::SETTING, [
            'book_id' => $book->id,
            'start_page' => $startPage,
            'started_at' => CarbonImmutable::now()->toIso8601String(),
            'paused_at' => null,
            'paused_seconds' => 0,
        ]);
    }

    public function pause(): void
    {
        $timer = $this->current();

        if ($timer !== null && $timer['paused_at'] === null) {
            Setting::put(self::SETTING, [...$timer, 'paused_at' => CarbonImmutable::now()->toIso8601String()]);
        }
    }

    public function resume(): void
    {
        $timer = $this->current();

        if ($timer !== null && $timer['paused_at'] !== null) {
            Setting::put(self::SETTING, [
                ...$timer,
                'paused_at' => null,
                'paused_seconds' => $timer['paused_seconds'] + $this->secondsSince($timer['paused_at']),
            ]);
        }
    }

    /**
     * Segundos lidos, sem as pausas.
     *
     * @param  TimerState  $timer
     */
    public function elapsedSeconds(array $timer): int
    {
        $end = $timer['paused_at'] === null ? CarbonImmutable::now() : CarbonImmutable::parse($timer['paused_at']);
        $total = (int) CarbonImmutable::parse($timer['started_at'])->diffInSeconds($end, absolute: true);

        return max(0, $total - $timer['paused_seconds']);
    }

    /**
     * Para o timer e registra a sessão de hoje com os minutos contados
     * (no mínimo 1). Sem timer, não faz nada.
     */
    public function finish(int $pageTo): ?ReadingSession
    {
        $timer = $this->current();

        if ($timer === null) {
            return null;
        }

        $book = Book::query()->findOrFail($timer['book_id']);
        $reading = $this->readings->readingFor($book);

        if ($pageTo <= $timer['start_page']) {
            throw ValidationException::withMessages([
                'page_to' => "Informe uma página depois da pág. {$timer['start_page']}.",
            ]);
        }

        $minutes = max(1, (int) round($this->elapsedSeconds($timer) / 60));

        // Numa transação: se a sessão for recusada, a página inicial não fica gravada.
        $session = DB::transaction(function () use ($reading, $timer, $pageTo, $minutes) {
            // Páginas lidas antes do timer, sem registro: o livro avança até a página inicial.
            if ($timer['start_page'] > $reading->current_page) {
                $reading->current_page = $timer['start_page'];
                $reading->save();
            }

            return $this->readings->registerSession($reading, $pageTo, $minutes, Carbon::today());
        });

        $this->discard();

        return $session;
    }

    public function discard(): void
    {
        Setting::query()->whereKey(self::SETTING)->delete();
    }

    private function secondsSince(string $moment): int
    {
        return (int) CarbonImmutable::parse($moment)->diffInSeconds(CarbonImmutable::now(), absolute: true);
    }
}
