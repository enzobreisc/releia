<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Http\Presenters\BookPresenter;
use App\Http\Presenters\ReadingPresenter;
use App\Models\Reading;
use App\Models\Setting;
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
     * Leituras em andamento, uma por livro, mais recente primeiro.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function readingNow(): Collection
    {
        return Reading::query()
            ->current()
            ->where('status', ReadingStatus::Lendo)
            ->with('book.authors')
            ->latest('id')
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
        $reading = Reading::query()
            ->current()
            ->where('status', ReadingStatus::Lendo)
            ->with('book.authors')
            ->latest('id')
            ->first();

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
            ->where('status', ReadingStatus::Lido)
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

    /**
     * Últimos livros terminados, mais recente primeiro.
     *
     * @return list<array<string, mixed>>
     */
    public function recentlyFinished(int $limit = 5): array
    {
        return array_values(Reading::query()
            ->current()
            ->where('status', ReadingStatus::Lido)
            ->with('book.authors')
            ->orderByDesc('finished_at')
            ->limit($limit)
            ->get()
            ->map(fn (Reading $reading) => BookPresenter::card($reading->book))
            ->all());
    }
}
