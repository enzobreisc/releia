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

    public const PINS_SETTING = 'pinned_books';

    /** Nome e frase do leitor, editáveis no perfil (o nome também aparece no cumprimento do Início). */
    private const READER_SETTING = 'reader';

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

    /**
     * @return array{name: string|null, bio: string|null}
     */
    public function reader(): array
    {
        $stored = Setting::get(self::READER_SETTING, []);
        $stored = is_array($stored) ? $stored : [];

        return [
            'name' => is_string($stored['name'] ?? null) ? $stored['name'] : null,
            'bio' => is_string($stored['bio'] ?? null) ? $stored['bio'] : null,
        ];
    }

    public function updateReader(?string $name, ?string $bio): void
    {
        Setting::put(self::READER_SETTING, [
            'name' => $name === null || trim($name) === '' ? null : trim($name),
            'bio' => $bio === null || trim($bio) === '' ? null : trim($bio),
        ]);
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
        Setting::put(self::PINS_SETTING, $ids);

        return true;
    }

    public function unpin(Book $book): void
    {
        Setting::put(self::PINS_SETTING, array_values(array_filter(
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
        $stored = Setting::get(self::PINS_SETTING, []);

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
     * Cada evento tem type (finished, session, added ou reread), book_id, title e date, mais o que o tipo precisa.
     *
     * @return list<array<string, mixed>>
     */
    public function recentActivity(int $limit = 8): array
    {
        // Abandonados também têm finished_at: só leituras lidas são "terminadas".
        $finished = Reading::query()
            ->with('book')
            ->where('status', ReadingStatus::Read->value)
            ->whereNotNull('finished_at')
            ->orderByDesc('finished_at')
            ->limit($limit)
            ->get()
            ->map(fn (Reading $reading) => [
                'type' => 'finished',
                'book_id' => $reading->book_id,
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
                'book_id' => $session->reading->book_id,
                'title' => $session->reading->book->title,
                'date' => $session->read_on->toDateString(),
                'pages' => $session->pages(),
            ]);

        // Cada leitura nova é um evento: a primeira do livro é "adicionou", as outras são releituras.
        $firstReadings = Reading::query()->selectRaw('min(id) AS id')->groupBy('book_id')->pluck('id')->map(fn ($id) => (int) $id)->all();

        $added = Reading::query()
            ->with('book')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->map(fn (Reading $reading) => [
                'type' => in_array($reading->id, $firstReadings, true) ? 'added' : 'reread',
                'book_id' => $reading->book_id,
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
