<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\ReadingPresenter;
use App\Models\QueueItem;
use App\Models\Reading;
use App\Models\Setting;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/** Números da tela Início e do mini cartão da barra lateral. */
class DashboardService
{
    public function __construct(
        private readonly ReadingService $readings,
        private readonly ReadingActivity $activity,
    ) {}

    /**
     * Readings in progress, one per book, the last one read first.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function readingNow(): Collection
    {
        return $this->readingsInProgress()
            ->get()
            ->map(fn (Reading $reading) => ReadingPresenter::summary($reading, $this->readings))
            ->values();
    }

    /**
     * Mini cartão "lendo agora": a leitura mais recente, o mapa dos últimos
     * sete dias e a sequência. Null quando nada está em andamento.
     *
     * @return array<string, mixed>|null
     */
    public function sidebarCard(Carbon $today): ?array
    {
        $reading = $this->readingsInProgress()->first();

        if ($reading === null) {
            return null;
        }

        return [
            ...ReadingPresenter::summary($reading, $this->readings),
            'week' => $this->activity->lastWeekLevels($today),
            'streak' => $this->streak($today),
        ];
    }

    /** Sequência atual (dias seguidos com leitura). */
    public function streak(Carbon $today): int
    {
        return ReadingActivity::streak($this->activity->daysWithSessions(), $today)['current'];
    }

    /**
     * Meta do ano e previsão linear: livros concluídos ÷ dias passados × dias do ano.
     * Conta leituras concluídas (releituras entram). Sem meta definida, devolve null.
     *
     * @return array{year: int, goal: int|null, finished: int, projected: int}
     */
    public function yearGoal(Carbon $today): array
    {
        $year = $today->year;
        $finished = Reading::query()
            ->where('status', ReadingStatus::Read)
            ->whereYear('finished_at', $year)
            ->count();

        $daysPassed = $today->dayOfYear;
        $daysInYear = $today->copy()->endOfYear()->dayOfYear;

        $goal = Setting::get('yearly_goal');

        return [
            'year' => $year,
            'goal' => is_int($goal) ? $goal : null,
            'finished' => $finished,
            'projected' => (int) round($finished / $daysPassed * $daysInYear),
        ];
    }

    /** Pages the reader wants to read each day; null while no goal is set. */
    public function dailyGoal(): ?int
    {
        $goal = Setting::get('daily_goal');

        return is_int($goal) ? $goal : null;
    }

    /**
     * Últimos livros terminados, mais recente primeiro, com o dia em que terminaram
     * e quantos dias levaram (nulos quando a leitura não tem as duas datas).
     *
     * @return list<array<string, mixed>>
     */
    public function recentlyFinished(int $limit = 5): array
    {
        return array_values(Reading::query()
            ->current()
            ->where('status', ReadingStatus::Read)
            ->with('book.authors')
            ->orderByDesc('finished_at')
            ->limit($limit)
            ->get()
            ->map(fn (Reading $reading) => [
                ...BookPresenter::card($reading->book),
                'finished_at' => $reading->finished_at?->toDateString(),
                'days' => $reading->started_at === null || $reading->finished_at === null
                    ? null
                    : (int) $reading->started_at->diffInDays($reading->finished_at) + 1,
            ])
            ->all());
    }

    /**
     * The first book in the queue with its place in it; null when the queue is empty.
     *
     * @return array{book_id: int, title: string, authors: string, cover_url: string|null, pages: int|null, position: int, total: int}|null
     */
    public function nextInQueue(): ?array
    {
        $item = QueueItem::query()->with('book.authors')->orderBy('position')->first();

        if ($item === null) {
            return null;
        }

        return [
            'book_id' => $item->book_id,
            'title' => $item->book->title,
            'authors' => $item->book->authors->pluck('name')->implode(', '),
            'cover_url' => BookPresenter::coverUrl($item->book),
            'pages' => $item->book->pages,
            'position' => $item->position,
            'total' => QueueItem::query()->count(),
        ];
    }

    /**
     * Ordered by the latest logged session, so a book just added to the shelf
     * does not take the place of the one actually being read.
     *
     * @return Builder<Reading>
     */
    private function readingsInProgress(): Builder
    {
        return Reading::query()
            ->current()
            ->where('status', ReadingStatus::Reading)
            ->with('book.authors')
            ->withMax('sessions', 'id')
            ->orderByRaw('sessions_max_id is null')
            ->orderByDesc('sessions_max_id')
            ->latest('id');
    }
}
