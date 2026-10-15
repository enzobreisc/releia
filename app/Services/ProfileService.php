<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Models\Setting;
use Illuminate\Support\Collection;

/**
 * Livros fixados e atividade recente do perfil.
 *
 * Os fixados são uma lista de ids na tabela settings, em ordem de fixação. Não exigem
 * coluna nova em books, e a lista é pequena (no máximo MAX_PINS).
 */
class ProfileService
{
    public const MAX_PINS = 6;

    private const SETTING = 'pinned_books';

    /**
     * Livros fixados, na ordem em que foram fixados. Ids de livros excluídos são ignorados.
     *
     * @return Collection<int, Book>
     */
    public function pinned(): Collection
    {
        $ids = $this->pinnedIds();

        if ($ids === []) {
            return collect();
        }

        $books = Book::query()
            ->with(['authors', 'currentReading'])
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        return collect($ids)
            ->map(fn (int $id) => $books->get($id))
            ->filter()
            ->values();
    }

    /** Fixa um livro. Retorna false se já estiver no limite. */
    public function pin(Book $book): bool
    {
        $ids = $this->pinnedIds();

        if (in_array($book->id, $ids, true)) {
            return true;
        }

        if (count($ids) >= self::MAX_PINS) {
            return false;
        }

        $ids[] = $book->id;
        Setting::put(self::SETTING, $ids);

        return true;
    }

    public function unpin(Book $book): void
    {
        Setting::put(self::SETTING, array_values(array_filter(
            $this->pinnedIds(),
            fn (int $id) => $id !== $book->id,
        )));
    }

    /**
     * Ids fixados em ordem. Ids de livros que não existem mais são descartados.
     *
     * @return list<int>
     */
    public function pinnedIds(): array
    {
        $stored = Setting::get(self::SETTING, []);

        if (! is_array($stored)) {
            return [];
        }

        $ids = array_map('intval', $stored);
        $existing = Book::query()->whereIn('id', $ids)->pluck('id')->map(fn ($id) => (int) $id)->all();

        return array_values(array_filter($ids, fn (int $id) => in_array($id, $existing, true)));
    }

    /**
     * Eventos recentes: leituras terminadas, sessões registradas e livros adicionados.
     *
     * Cada evento tem type (finished, session ou added), title e date, mais o que o tipo precisa.
     *
     * @return list<array<string, mixed>>
     */
    public function recentActivity(int $limit = 8): array
    {
        // Abandonados também têm finished_at: só leituras lidas são "terminadas".
        $finished = Reading::query()
            ->with('book')
            ->where('status', ReadingStatus::Lido->value)
            ->whereNotNull('finished_at')
            ->orderByDesc('finished_at')
            ->limit($limit)
            ->get()
            ->map(fn (Reading $reading) => [
                'type' => 'finished',
                'title' => $reading->book->title,
                'date' => $reading->finished_at->toDateString(),
                'rating' => $reading->rating,
            ]);

        $sessions = ReadingSession::query()
            ->with('reading.book')
            ->orderByDesc('read_on')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (ReadingSession $session) => [
                'type' => 'session',
                'title' => $session->reading->book->title,
                'date' => $session->read_on->toDateString(),
                'pages' => $session->pages(),
            ]);

        $added = Reading::query()
            ->with('book')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (Reading $reading) => [
                'type' => 'added',
                'title' => $reading->book->title,
                'date' => $reading->created_at->toDateString(),
            ]);

        return array_values($finished
            ->concat($sessions)
            ->concat($added)
            ->sortByDesc('date')
            ->take($limit)
            ->all());
    }
}
