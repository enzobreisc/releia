<?php

namespace App\Services;

use App\Models\ReadingSession;
use Illuminate\Support\Carbon;

/**
 * Atividade diária: páginas por dia, sequência de dias e níveis do mapa de calor.
 * Fica fora do ReadingService para a estatística (fase 4) reaproveitar as mesmas contas.
 */
class ReadingActivity
{
    /**
     * Páginas lidas por dia entre duas datas (inclusive), somando todas as leituras.
     *
     * @return array<string, int> dia (Y-m-d) => páginas
     */
    public function pagesByDay(Carbon $from, Carbon $to): array
    {
        return ReadingSession::query()
            ->whereRaw('date(read_on) between ? and ?', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('date(read_on) as day, sum(page_to - page_from + 1) as pages')
            ->groupBy('day')
            ->pluck('pages', 'day')
            ->map(fn ($pages) => (int) $pages)
            ->all();
    }

    /**
     * Dias com pelo menos uma sessão, em ordem crescente (Y-m-d).
     *
     * @return list<string>
     */
    public function daysWithSessions(): array
    {
        return array_values(ReadingSession::query()
            ->selectRaw('date(read_on) as day')
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('day')
            ->map(fn ($day) => (string) $day)
            ->all());
    }

    /**
     * Níveis do mapa de calor dos últimos sete dias, do mais antigo ao de hoje.
     *
     * @return list<int>
     */
    public function lastWeekLevels(Carbon $today): array
    {
        $pages = $this->pagesByDay($today->copy()->subDays(6), $today);

        $levels = [];

        for ($offset = 6; $offset >= 0; $offset--) {
            $levels[] = self::level($pages[$today->copy()->subDays($offset)->toDateString()] ?? 0);
        }

        return $levels;
    }

    /**
     * Nível 0 (sem leitura) a 4, pela quantidade de páginas no dia. Usa a mesma
     * escala das estatísticas, para o mini mapa e o calendário baterem.
     */
    public static function level(int $pages): int
    {
        return StatsService::heatLevel($pages);
    }

    /**
     * Sequência de dias seguidos com leitura.
     *
     * Se hoje ainda não tem sessão, a sequência atual continua valendo a partir
     * de ontem: ela só se perde quando o dia termina sem leitura.
     *
     * @param  list<string>  $days  dias com leitura (Y-m-d)
     * @return array{current: int, longest: int}
     */
    public static function streak(array $days, Carbon $today): array
    {
        $set = array_fill_keys($days, true);

        $longest = 0;
        $run = 0;
        $previous = null;

        $sorted = array_keys($set);
        sort($sorted);

        foreach ($sorted as $day) {
            $date = Carbon::parse($day)->startOfDay();
            $run = $previous !== null && $previous->copy()->addDay()->isSameDay($date) ? $run + 1 : 1;
            $longest = max($longest, $run);
            $previous = $date;
        }

        $cursor = isset($set[$today->toDateString()]) ? $today->copy() : $today->copy()->subDay();
        $current = 0;

        while (isset($set[$cursor->toDateString()])) {
            $current++;
            $cursor->subDay();
        }

        return ['current' => $current, 'longest' => $longest];
    }
}
