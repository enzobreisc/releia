<?php

namespace App\Services;

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Models\Setting;
use Illuminate\Support\Collection;

/**
 * Pinned books and recent activity for the profile.
 *
 * Pins are a list of ids in the settings table, in pin order, so books needs no new column.
 * The list is small (at most MAX_PINS).
 */
class ProfileService
{
    public const MAX_PINS = 6;

    public const PINS_SETTING = 'pinned_books';

    /** Reader name and bio, editable on the profile (the name is also used in the Home greeting). */
    private const READER_SETTING = 'reader';

    /**
     * Pinned books, in pin order. Ids of deleted books are skipped.
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

    /** Pins a book. Returns false when the pin limit is reached. */
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
     * Pinned ids in order. Ids of books that no longer exist are dropped.
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
     * Recent events: finished readings, logged sessions and added books. Each event has a type
     * (finished, session, added or reread), book_id, title and date, plus the fields its type needs.
     *
     * @return list<array<string, mixed>>
     */
    public function recentActivity(int $limit = 8): array
    {
        // Abandoned readings also have finished_at, so only read books count as finished.
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

        // Each new reading is an event: the first one of a book means "added", the others are rereads.
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
