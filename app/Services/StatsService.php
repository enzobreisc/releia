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
 * Books are counted by completed reading (read status with an end date in the period),
 * so a reread counts again. Dates are `date` columns that Eloquent may save with a time,
 * which is why the filters use a half-open range (>= start, < next day).
 */
class StatsService
{
    public function period(?int $year): StatsPeriod
    {
        if ($year !== null) {
            return StatsPeriod::year($year);
        }

        return StatsPeriod::history($this->firstActivityDate());
    }

    /**
     * @return list<int>
     */
    public function years(): array
    {
        $first = $this->firstActivityDate()->year;
        $current = CarbonImmutable::today()->year;

        return array_reverse(range(min($first, $current), $current));
    }

    /**
     * Period indicators. Pages per day use the elapsed days; the average per reading day
     * uses only days with a session.
     *
     * @return array{books_read: int, rereads: int, pages_read: int, pages_per_day: float|null, pages_per_reading_day: float|null, reading_days: int, days_per_book: float|null}
     */
    public function indicators(StatsPeriod $period): array
    {
        $sessionPages = $this->sessionPages($period);
        $pages = $sessionPages + $this->fallbackPages($period);

        $daysWithReading = $this->daysWithReading($period);

        return [
            'books_read' => $this->concluded($period)->count(),
            // Rereads are already counted in books_read; this number is shown as a note beside it.
            'rereads' => $this->rereads($period)->count(),
            'pages_read' => $pages,
            'pages_per_day' => $this->ratio($pages, $period->elapsedDays()),
            'pages_per_reading_day' => $this->ratio($sessionPages, $daysWithReading),
            'reading_days' => $daysWithReading,
            'days_per_book' => $this->averageDaysPerBook($period),
        ];
    }

    /**
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
     * Most read genres by finished-book count. Ties are sorted alphabetically.
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
     * Most read authors. A book with two authors counts for both of them.
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
     * Month with the most finished books. Ties go to the earlier month.
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
     * Streak of consecutive days with at least one session. The current streak ends on the
     * last day of the period that has already happened; if today has no reading yet, it still
     * counts until yesterday.
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
     * Pages per day for each day of the period, with its color level (0 = no reading).
     *
     * Only sessions have a date, so pages of books without sessions stay out of the calendar.
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
     * Heatmap level for a day, by pages read. Thresholds: 1-20 (level 1), 21-40 (2),
     * 41-70 (3), 71 or more (4). A typical reading day falls between 20 and 40 pages;
     * 71 or more is a long session.
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
     * Linear projection for the year: finished books ÷ elapsed days × days in the year.
     * Only available for the current year; other years and the history return null.
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
     * Best readings of the period by rating. Ties go to more pages, then the most recent.
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
     * @return array{indicators: array<string, mixed>, genre: array{label: string, count: int}|null, author: array{label: string, count: int}|null, extremes: array{fastest: Reading|null, longest: Reading|null}, best_month: array{month: string, count: int}|null, streak: array{current: int, longest: int}, top: Collection<int, Reading>, rereads: list<string>}
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
            'rereads' => array_values($this->rereads($period)->with('book')->orderBy('finished_at')->get()
                ->map(fn (Reading $reading) => $reading->book->title)->all()),
        ];
    }

    /**
     * Rereads finished in the period: readings that have an older reading of the same book.
     *
     * @return Builder<Reading>
     */
    public function rereads(StatsPeriod $period): Builder
    {
        return $this->concluded($period)->whereExists(fn ($query) => $query
            ->selectRaw('1')
            ->from('readings AS earlier')
            ->whereColumn('earlier.book_id', 'readings.book_id')
            ->whereColumn('earlier.id', '<', 'readings.id'));
    }

    /**
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

    private function sessionPages(StatsPeriod $period): int
    {
        return (int) $this->inPeriod(ReadingSession::query(), 'read_on', $period)
            ->selectRaw('COALESCE(SUM(MAX(page_to - page_from + 1, 0)), 0) AS total')
            ->toBase()
            ->value('total');
    }

    /**
     * Books finished in the period with no session have no progress record, so their
     * total page count is used instead.
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
