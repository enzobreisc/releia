<?php

namespace App\Services;

use App\Models\Book;
use App\Models\QueueItem;
use App\Models\Reading;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Fila de próximas leituras: ordem, estimativa de dias e ritmo. */
class QueueService
{
    /** Ritmo usado quando ainda não há sessões registradas. */
    public const DEFAULT_PAGES_PER_DAY = 20;

    /** Janela, em dias, para calcular o ritmo a partir das sessões. */
    private const PACE_WINDOW_DAYS = 30;

    /** Livro já na fila não entra de novo: a chamada é idempotente. */
    public function add(Book $book): QueueItem
    {
        return DB::transaction(function () use ($book) {
            $existing = QueueItem::query()->where('book_id', $book->id)->first();

            if ($existing !== null) {
                return $existing;
            }

            return QueueItem::create([
                'book_id' => $book->id,
                'position' => (int) QueueItem::query()->max('position') + 1,
                'added_at' => now(),
            ]);
        });
    }

    /** Tira o livro da fila, se estiver nela (ao começar a ler, por exemplo). */
    public function removeBook(Book $book): void
    {
        $item = QueueItem::query()->where('book_id', $book->id)->first();

        if ($item !== null) {
            $this->remove($item);
        }
    }

    public function remove(QueueItem $item): void
    {
        DB::transaction(function () use ($item) {
            $item->delete();
            $this->compact();
        });
    }

    /**
     * Grava a nova ordem. Recebe o id de todos os itens da fila, na ordem desejada;
     * se a lista não bater com a fila atual (outra aba mexeu nela), recusa.
     *
     * @param  list<int>  $ids
     */
    public function reorder(array $ids): void
    {
        $current = QueueItem::query()->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
        $requested = $ids;
        sort($requested);

        if ($requested !== $current) {
            throw ValidationException::withMessages([
                'ids' => 'A fila mudou. Atualize a página e tente de novo.',
            ]);
        }

        DB::transaction(function () use ($ids) {
            foreach ($ids as $position => $id) {
                QueueItem::query()->whereKey($id)->update(['position' => $position + 1]);
            }
        });
    }

    /** Renumera as posições em 1..n, sem buracos depois de uma remoção. */
    private function compact(): void
    {
        QueueItem::query()
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->values()
            ->each(function (QueueItem $item, int $index) {
                if ($item->position !== $index + 1) {
                    $item->update(['position' => $index + 1]);
                }
            });
    }

    /**
     * Ritmo em páginas por dia: média das páginas nos dias em que você leu,
     * entre os últimos 30 dias. Sem sessões, usa o padrão.
     *
     * @return array{pages_per_day: float, from_sessions: bool}
     */
    public function pace(Carbon $today): array
    {
        $from = $today->copy()->subDays(self::PACE_WINDOW_DAYS - 1)->toDateString();

        $pagesPerDay = DB::table('reading_sessions')
            ->selectRaw('date(read_on) as day, sum(page_to - page_from + 1) as pages')
            ->whereDate('read_on', '>=', $from)
            ->whereDate('read_on', '<=', $today->toDateString())
            ->groupBy('day')
            ->pluck('pages');

        if ($pagesPerDay->isEmpty()) {
            return ['pages_per_day' => (float) self::DEFAULT_PAGES_PER_DAY, 'from_sessions' => false];
        }

        return ['pages_per_day' => round((float) $pagesPerDay->avg(), 1), 'from_sessions' => true];
    }

    /**
     * Dias para terminar o livro no ritmo dado. Null quando o livro não tem número de páginas.
     */
    public function estimateDays(Book $book, float $pagesPerDay): ?int
    {
        if ($book->pages === null || $pagesPerDay <= 0) {
            return null;
        }

        $reading = $book->currentReading;
        $currentPage = $reading instanceof Reading ? $reading->current_page : 0;
        $remaining = max(0, $book->pages - $currentPage);

        return (int) ceil($remaining / $pagesPerDay);
    }
}
