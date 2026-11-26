<?php

declare(strict_types=1);

use App\Models\Book;
use App\Models\Note;
use App\Models\QueueItem;
use App\Models\ReadingSession;
use App\Models\Recommendation;
use App\Models\ShoppingItem;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/**
 * Plays one scenario: every call is a real request, its landed page is saved as a golden, and the steps are recorded.
 */
final class ScenarioRunner
{
    /** @var list<array<string, mixed>> */
    private array $steps = [];

    private int $pendingSeconds = 0;

    private ?string $undoToken = null;

    /** @var array<string, mixed>|null */
    private ?array $lastPage = null;

    public function __construct(
        private readonly InertiaClient $client,
        private readonly string $directory,
        /** @var array<string, array<int, string|null>> */
        private array $remote,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function steps(): array
    {
        return $this->steps;
    }

    public function advance(int $minutes): void
    {
        $this->pendingSeconds += $minutes * 60;
        Carbon::setTestNow(Carbon::now()->addMinutes($minutes));
        CarbonImmutable::setTestNow(CarbonImmutable::now()->addMinutes($minutes));
    }

    /**
     * @param  array<string, mixed>|null  $body
     * @param  list<string>  $pages  Affected pages to save too, as slugs.
     */
    public function step(string $name, string $method, string $url, ?array $body, array $pages = []): void
    {
        $seconds = $this->pendingSeconds;
        $this->pendingSeconds = 0;
        $tokenInUrl = $this->undoToken;

        $recordedBefore = Http::recorded()->count();
        $landed = $this->client->send($method, $url, $body);
        $learnedCovers = $this->learnDownloadedCovers($recordedBefore);

        $this->lastPage = $landed['page'];
        $this->undoToken = $this->lastPage['props']['toast']['undo'] ?? null;
        $index = count($this->steps) + 1;
        $prefix = sprintf('%02d-%s', $index, $name);
        $landedSlug = $this->slugOf($landed['url']);

        $dumped = [$landedSlug];
        $this->save($prefix, $landedSlug, $landed['page']);

        foreach ($pages as $slug) {
            if (in_array($slug, $dumped, true)) {
                continue;
            }

            $this->save($prefix, $slug, $this->client->send('GET', $this->urlOf($slug))['page']);
            $dumped[] = $slug;
        }

        if (count($dumped) > 1) {
            $this->client->send('GET', $landed['url']);
        }

        $recordedUrl = $tokenInUrl === null ? $url : str_replace($tokenInUrl, 'undo-token', $url);

        $this->steps[] = array_filter([
            'step' => $prefix,
            'method' => $method,
            'url' => $recordedUrl,
            'body' => $body,
            'golden' => $landedSlug,
            'dumped' => $dumped,
            'seconds_elapsed' => $seconds > 0 ? $seconds : null,
            'remote_covers' => $learnedCovers === [] ? null : $learnedCovers,
        ], fn (mixed $value) => $value !== null);
    }

    /** Token of the undo offered by the last landed page. */
    public function undoToken(): string
    {
        $token = $this->lastPage['props']['toast']['undo'] ?? null;

        if (! is_string($token)) {
            throw new RuntimeException('The last page offers no undo.');
        }

        return $token;
    }

    public function bookId(string $title): int
    {
        return Book::query()->where('title', $title)->firstOrFail()->id;
    }

    public function currentPage(string $title): int
    {
        return (int) Book::query()->where('title', $title)->firstOrFail()->currentReading->current_page;
    }

    public function currentReadingId(string $title): int
    {
        return Book::query()->where('title', $title)->firstOrFail()->currentReading->id;
    }

    public function shoppingId(string $title): int
    {
        return ShoppingItem::query()->where('title', $title)->firstOrFail()->id;
    }

    public function recommendationId(string $title): int
    {
        return Recommendation::query()->where('title', $title)->firstOrFail()->id;
    }

    public function queueItemId(string $title): int
    {
        return QueueItem::query()->whereHas('book', fn ($query) => $query->where('title', $title))->firstOrFail()->id;
    }

    public function noteId(string $title): int
    {
        return Note::query()->whereHas('book', fn ($query) => $query->where('title', $title))->orderBy('id')->firstOrFail()->id;
    }

    /** @return array{id: int, read_on: string, page_to: int} */
    public function latestSession(string $title): array
    {
        $session = ReadingSession::query()
            ->whereHas('reading.book', fn ($query) => $query->where('title', $title))
            ->latest('id')
            ->firstOrFail();

        return ['id' => $session->id, 'read_on' => $session->read_on->toDateString(), 'page_to' => $session->page_to];
    }

    /** @return list<int> Queue item ids in queue order. */
    public function queueOrder(): array
    {
        return QueueItem::query()->orderBy('position')->pluck('id')->map(fn ($id) => (int) $id)->all();
    }

    /**
     * Only Open Library cover downloads are served (faked); any other request during a step is refused.
     * A book that received a downloaded cover is given the remote URL of the shopping item or
     * suggestion with the same title, the row the cover came from.
     *
     * @return array<string, string> Book id to remote cover URL learned during the step.
     */
    private function learnDownloadedCovers(int $recordedBefore): array
    {
        foreach (Http::recorded()->slice($recordedBefore) as [$request]) {
            if (! str_contains($request->url(), 'covers.openlibrary.org/')) {
                throw new RuntimeException("Scenario step needed the network: {$request->url()}");
            }
        }

        $learned = [];

        foreach (Book::query()->whereNotNull('cover_path')->orderBy('id')->get(['id', 'title']) as $book) {
            if (array_key_exists($book->id, $this->remote['books'] ?? [])) {
                continue;
            }

            $url = ShoppingItem::query()->where('title', $book->title)->whereNotNull('cover_url')->value('cover_url')
                ?? Recommendation::query()->where('title', $book->title)->whereNotNull('cover_url')->value('cover_url');

            if ($url === null) {
                throw new RuntimeException("No remote cover URL is known for {$book->title}.");
            }

            $this->remote['books'][$book->id] = $url;
            $learned[(string) $book->id] = $url;
        }

        return $learned;
    }

    private function urlOf(string $slug): string
    {
        if (preg_match('/^(book|author)-(\d+)$/', $slug, $matches) === 1) {
            return ($matches[1] === 'book' ? '/library/' : '/authors/').$matches[2];
        }

        return match ($slug) {
            'home' => '/',
            'library-add' => '/library/add',
            default => '/'.$slug,
        };
    }

    private function slugOf(string $url): string
    {
        $path = (string) parse_url($url, PHP_URL_PATH);

        return match (true) {
            $path === '/' => 'home',
            (bool) preg_match('#^/library/(\d+)$#', $path, $matches) => "book-{$matches[1]}",
            default => trim(str_replace('/', '-', $path), '-'),
        };
    }

    /**
     * @param  array<string, mixed>  $page
     */
    private function save(string $prefix, string $slug, array $page): void
    {
        if (! array_key_exists('component', $page)) {
            throw new RuntimeException("{$slug} did not render an Inertia page.");
        }

        File::put(
            "{$this->directory}/{$prefix}-{$slug}.json",
            json_encode(withRemoteUrls($this->withoutRandomToasts($page), $this->remote), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).PHP_EOL,
        );
    }

    /**
     * Undo tokens and toast ids are random per request; the golden keeps them as placeholders.
     *
     * @param  array<string, mixed>  $page
     * @return array<string, mixed>
     */
    private function withoutRandomToasts(array $page): array
    {
        if (isset($page['props']['toast']['id'])) {
            $page['props']['toast']['id'] = 'toast-id';
        }

        if (isset($page['props']['toast']['undo'])) {
            $page['props']['toast']['undo'] = 'undo-token';
        }

        return $page;
    }
}
