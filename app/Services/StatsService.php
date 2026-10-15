<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Models\Setting;
use App\Support\StatsPeriod;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Métricas da seção 6 do escopo.
 *
 * Livros são contados por leitura concluída (status lido com data de fim no período),
 * então uma releitura conta de novo. Datas são colunas `date`, que o Eloquent pode
 * gravar com hora: por isso os filtros usam intervalo semiaberto (>= início, < dia seguinte).
 */
class StatsService
{
    /** Escolhe o período: um ano, ou o histórico inteiro quando $year é null. */
    public function period(?int $year): StatsPeriod
    {
        if ($year !== null) {
            return StatsPeriod::year($year);
        }

        return StatsPeriod::history($this->firstActivityDate());
    }

    /**
     * Anos com atividade, do mais recente ao mais antigo, incluindo o ano atual.
     *
     * @return list<int>
     */
    public function years(): array
    {
        $first = $this->firstActivityDate()->year;
        $current = CarbonImmutable::today()->year;

        return array_reverse(range(min($first, $current), $current));
    }

    /**
     * Indicadores do período. Páginas por dia usam os dias decorridos; a média
     * "com leitura" usa só os dias com sessão.
     *
     * @return array{books_read: int, pages_read: int, pages_per_day: float|null, pages_per_reading_day: float|null, reading_days: int, days_per_book: float|null}
     */
    public function indicators(StatsPeriod $period): array
    {
        $sessionPages = $this->sessionPages($period);
        $pages = $sessionPages + $this->fallbackPages($period);

        $daysWithReading = $this->daysWithReading($period);

        return [
            'books_read' => $this->concluded($period)->count(),
            'pages_read' => $pages,
            'pages_per_day' => $this->ratio($pages, $period->elapsedDays()),
            'pages_per_reading_day' => $this->ratio($sessionPages, $daysWithReading),
            'reading_days' => $daysWithReading,
            'days_per_book' => $this->averageDaysPerBook($period),
        ];
    }

    /**
     * Livros concluídos por mês (ano) ou por ano (histórico), zeros incluídos.
     *
     * @return list<array{key: string, count: int}>
     */
    public function booksPerBucket(StatsPeriod $period): array
    {
        $format = $period->history ? '%Y' : '%Y-%m';

        $counts = $this->concluded($period)
            ->selectRaw("strftime('{$format}', readings.finished_at) AS bucket, COUNT(*) AS total")
            ->groupBy('bucket')
            ->toBase()
            ->pluck('total', 'bucket');

        $keys = $period->history
            ? array_map(fn (int $year) => (string) $year, range($period->start->year, $period->end->year))
            : array_map(fn (int $month) => sprintf('%d-%02d', $period->start->year, $month), range(1, 12));

        return array_map(fn (string $key) => [
            'key' => $key,
            'count' => (int) ($counts[$key] ?? 0),
        ], $keys);
    }

    /**
     * Gêneros mais lidos pela contagem de livros concluídos. Empate: ordem alfabética.
     *
     * @return list<array{label: string, count: int}>
     */
    public function genres(StatsPeriod $period, int $limit = 6): array
    {
        $rows = $this->concluded($period)
            ->join('books', 'books.id', '=', 'readings.book_id')
            ->whereNotNull('books.genre')
            ->selectRaw('books.genre AS label, COUNT(*) AS total')
            ->groupBy('books.genre')
            ->orderByDesc('total')
            ->orderBy('label')
            ->limit($limit)
            ->toBase()
            ->get();

        return $this->labelCounts($rows);
    }

    /**
     * Autores mais lidos. Um livro com dois autores conta para os dois.
     *
     * @return list<array{label: string, count: int}>
     */
    public function authors(StatsPeriod $period, int $limit = 6): array
    {
        $rows = $this->concluded($period)
            ->join('books', 'books.id', '=', 'readings.book_id')
            ->join('author_book', 'author_book.book_id', '=', 'books.id')
            ->join('authors', 'authors.id', '=', 'author_book.author_id')
            ->selectRaw('authors.name AS label, COUNT(*) AS total')
            ->groupBy('authors.id', 'authors.name')
            ->orderByDesc('total')
            ->orderBy('label')
            ->limit($limit)
            ->toBase()
            ->get();

        return $this->labelCounts($rows);
    }

    /**
     * Leitura mais rápida (menor intervalo entre início e fim) e mais longa (mais páginas).
     *
     * @return array{fastest: Reading|null, longest: Reading|null}
     */
    public function extremes(StatsPeriod $period): array
    {
        $fastest = $this->concluded($period)
            ->whereNotNull('readings.started_at')
            ->with('book.authors')
            ->orderByRaw('julianday(readings.finished_at) - julianday(readings.started_at)')
            ->orderBy('readings.id')
            ->first();

        $longest = $this->concluded($period)
            ->join('books', 'books.id', '=', 'readings.book_id')
            ->whereNotNull('books.pages')
            ->select('readings.*')
            ->with('book.authors')
            ->orderByDesc('books.pages')
            ->orderBy('readings.id')
            ->first();

        return ['fastest' => $fastest, 'longest' => $longest];
    }

    /**
     * Mês com mais livros concluídos. Empate: o mês mais antigo.
     *
     * @return array{month: string, count: int}|null
     */
    public function bestMonth(StatsPeriod $period): ?array
    {
        $row = $this->concluded($period)
            ->selectRaw("strftime('%Y-%m', readings.finished_at) AS month, COUNT(*) AS total")
            ->groupBy('month')
            ->orderByDesc('total')
            ->orderBy('month')
            ->toBase()
            ->first();

        return $row === null ? null : ['month' => $row->month, 'count' => (int) $row->total];
    }

    /**
     * Sequência de dias seguidos com pelo menos uma sessão.
     *
     * "Atual" termina no último dia do período que já aconteceu. Se hoje ainda não
     * teve leitura, a sequência continua valendo até ontem.
     *
     * @return array{current: int, longest: int}
     */
    public function streaks(StatsPeriod $period): array
    {
        $days = $this->inPeriod(ReadingSession::query(), 'read_on', $period)
            ->distinct()
            ->selectRaw('date(read_on) AS day')
            ->orderBy('day')
            ->toBase()
            ->pluck('day')
            ->all();

        $longest = 0;
        $run = 0;
        $previous = null;

        foreach ($days as $day) {
            $consecutive = $previous !== null && Carbon::parse($previous)->addDay()->toDateString() === $day;
            $run = $consecutive ? $run + 1 : 1;
            $longest = max($longest, $run);
            $previous = $day;
        }

        $sessionDays = array_flip($days);
        $cursor = CarbonImmutable::parse($period->lastDay()->toDateString());

        if (! isset($sessionDays[$cursor->toDateString()])) {
            $cursor = $cursor->subDay();
        }

        $current = 0;

        while (isset($sessionDays[$cursor->toDateString()])) {
            $current++;
            $cursor = $cursor->subDay();
        }

        return ['current' => $current, 'longest' => $longest];
    }

    /**
     * Páginas por dia de cada dia do período, com o nível de cor (0 = sem leitura).
     *
     * Só sessões têm data: páginas de livros sem sessão não entram no calendário.
     *
     * @return list<array{date: string, pages: int, level: int}>
     */
    public function heatmap(StatsPeriod $period): array
    {
        $pages = $this->inPeriod(ReadingSession::query(), 'read_on', $period)
            ->selectRaw('date(read_on) AS day, SUM(MAX(page_to - page_from + 1, 0)) AS total')
            ->groupBy('day')
            ->toBase()
            ->pluck('total', 'day');

        $days = [];

        foreach (CarbonPeriod::create($period->start, $period->end) as $day) {
            $count = (int) ($pages[$day->toDateString()] ?? 0);

            $days[] = [
                'date' => $day->toDateString(),
                'pages' => $count,
                'level' => self::heatLevel($count),
            ];
        }

        return $days;
    }

    /**
     * Nível do mapa de calor para um dia. Limiares em páginas por dia:
     * 1 a 20 (nível 1), 21 a 40 (2), 41 a 70 (3), 71 ou mais (4). Um dia comum de
     * leitura fica entre 20 e 40 páginas; 71 ou mais é sessão longa.
     */
    public static function heatLevel(int $pages): int
    {
        return match (true) {
            $pages >= 71 => 4,
            $pages >= 41 => 3,
            $pages >= 21 => 2,
            $pages >= 1 => 1,
            default => 0,
        };
    }

    /**
     * Projeção linear do ano: livros concluídos ÷ dias decorridos × dias do ano.
     * Só existe para o ano atual; outros anos e o histórico retornam null.
     *
     * @return array{projection: int, goal: int|null, books: int}|null
     */
    public function forecast(StatsPeriod $period): ?array
    {
        if ($period->history || $period->start->year !== CarbonImmutable::today()->year) {
            return null;
        }

        $books = $this->concluded($period)->count();
        $goal = Setting::get('yearly_goal');

        return [
            'projection' => (int) round($books / $period->elapsedDays() * $period->daysInYear()),
            'goal' => $goal === null ? null : (int) $goal,
            'books' => $books,
        ];
    }

    /**
     * Melhores leituras do período pela nota. Empate: mais páginas, depois a mais recente.
     *
     * @return Collection<int, Reading>
     */
    public function topRated(StatsPeriod $period, int $limit = 5): Collection
    {
        return $this->concluded($period)
            ->whereNotNull('readings.rating')
            ->join('books', 'books.id', '=', 'readings.book_id')
            ->select('readings.*')
            ->with('book.authors')
            ->orderByDesc('readings.rating')
            ->orderByDesc('books.pages')
            ->orderByDesc('readings.finished_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Tudo o que o Wrapped mostra para um ano.
     *
     * @return array{indicators: array<string, mixed>, genre: array{label: string, count: int}|null, author: array{label: string, count: int}|null, extremes: array{fastest: Reading|null, longest: Reading|null}, best_month: array{month: string, count: int}|null, streak: array{current: int, longest: int}, top: Collection<int, Reading>}
     */
    public function wrapped(int $year): array
    {
        $period = StatsPeriod::year($year);

        return [
            'indicators' => $this->indicators($period),
            'genre' => $this->genres($period, 1)[0] ?? null,
            'author' => $this->authors($period, 1)[0] ?? null,
            'extremes' => $this->extremes($period),
            'best_month' => $this->bestMonth($period),
            'streak' => $this->streaks($period),
            'top' => $this->topRated($period),
        ];
    }

    /**
     * Leituras concluídas no período: status lido com data de fim dentro dele.
     *
     * @return Builder<Reading>
     */
    public function concluded(StatsPeriod $period): Builder
    {
        return $this->inPeriod(
            Reading::query()->where('readings.status', ReadingStatus::Read->value),
            'readings.finished_at',
            $period,
        );
    }

    /** Soma das páginas das sessões no período: página final − inicial + 1. */
    private function sessionPages(StatsPeriod $period): int
    {
        return (int) $this->inPeriod(ReadingSession::query(), 'read_on', $period)
            ->selectRaw('COALESCE(SUM(MAX(page_to - page_from + 1, 0)), 0) AS total')
            ->toBase()
            ->value('total');
    }

    /**
     * Livros concluídos no período que não têm nenhuma sessão: sem registro de
     * progresso, o total de páginas do livro entra na conta.
     */
    private function fallbackPages(StatsPeriod $period): int
    {
        return (int) $this->concluded($period)
            ->whereDoesntHave('sessions')
            ->join('books', 'books.id', '=', 'readings.book_id')
            ->sum('books.pages');
    }

    private function daysWithReading(StatsPeriod $period): int
    {
        return (int) $this->inPeriod(ReadingSession::query(), 'read_on', $period)
            ->selectRaw('COUNT(DISTINCT date(read_on)) AS total')
            ->toBase()
            ->value('total');
    }

    /** Média de dias entre início e fim, contando o primeiro dia (mesmo dia = 1). */
    private function averageDaysPerBook(StatsPeriod $period): ?float
    {
        $average = $this->concluded($period)
            ->whereNotNull('readings.started_at')
            ->selectRaw('AVG(julianday(readings.finished_at) - julianday(readings.started_at) + 1) AS total')
            ->toBase()
            ->value('total');

        return $average === null ? null : round((float) $average, 1);
    }

    /**
     * @param  Collection<int, \stdClass>  $rows
     * @return list<array{label: string, count: int}>
     */
    private function labelCounts(Collection $rows): array
    {
        return array_values($rows
            ->map(fn (\stdClass $row) => ['label' => (string) $row->label, 'count' => (int) $row->total])
            ->all());
    }

    /**
     * Aplica o período a uma coluna date, com intervalo semiaberto.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function inPeriod(Builder $query, string $column, StatsPeriod $period): Builder
    {
        return $query
            ->where($column, '>=', $period->start->toDateString())
            ->where($column, '<', $period->end->addDay()->toDateString());
    }

    private function ratio(int $total, int $days): ?float
    {
        return $days > 0 ? round($total / $days, 1) : null;
    }

    /** Primeira data registrada (início de leitura, fim ou sessão). Hoje, sem dados. */
    private function firstActivityDate(): CarbonImmutable
    {
        $dates = array_filter([
            Reading::query()->min('started_at'),
            Reading::query()->min('finished_at'),
            ReadingSession::query()->min('read_on'),
        ]);

        return $dates === []
            ? CarbonImmutable::today()
            : CarbonImmutable::parse(min($dates))->startOfDay();
    }
}
