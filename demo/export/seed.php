<?php

declare(strict_types=1);

require __DIR__.'/support.php';

use App\Enums\ReadingStatus;
use App\Enums\ShelfGrouping;
use App\Models\Book;
use App\Models\Note;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Models\Recommendation;
use App\Models\Setting;
use App\Models\ShoppingItem;
use App\Services\Bookcase;
use App\Services\CoverStore;
use App\Services\ProfileService;
use App\Services\QueueService;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

const EDITIONS = [
    'Torto Arado' => ['Todavia', 2019],
    'Sapiens' => ['L&PM', 2015],
    'Clean Code' => ['Prentice Hall', 2008],
    'Dom Casmurro' => ['Ática', 1998],
    'Pequeno Manual Antirracista' => ['Companhia das Letras', 2019],
    'O Hobbit' => ['HarperCollins', 2019],
    'Histórias Extraordinárias' => ['Companhia das Letras', 2008],
    'O Alquimista' => ['Paralela', 2017],
    'Refactoring' => ['Addison-Wesley', 2018],
    'Memórias Póstumas de Brás Cubas' => ['Penguin', 2014],
    'Ensaio sobre a cegueira' => ['Companhia das Letras', 1995],
    'Duna' => ['Aleph', 2017],
    'A Hora da Estrela' => ['Rocco', 2020],
    'Vidas Secas' => ['Record', 2019],
];

const SEED_LAST_DAY = '2026-10-14';
const EXCLUDED_TABLES = ['migrations', 'users', 'password_reset_tokens', 'sessions', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs'];

/**
 * Open Library lookups that the plain title/author search misses.
 */
const FALLBACK_SEARCHES = [
    'Messias de Duna' => 'Dune Messiah Herbert',
    'Quem tem medo do feminismo negro?' => 'Quem tem medo do feminismo negro',
    'O Silmarillion' => 'The Silmarillion Tolkien',
    'Grande Sertão: Veredas' => 'Grande sertão veredas',
];

/**
 * Remembers every cover URL used by the seed, so reruns do not depend on Open Library answering the same way.
 */
final class CoverCatalog
{
    private const SEARCH_URL = 'https://openlibrary.org/search.json';

    private const COVER_URL = 'https://covers.openlibrary.org/b/id/%s-L.jpg';

    /** @var array<string, array<string, string|null>> */
    private array $entries;

    public function __construct(private readonly string $path)
    {
        $this->entries = is_file($path)
            ? json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR)
            : [];
    }

    public function coverFor(string $section, string $title, string $author): ?string
    {
        if (array_key_exists($title, $this->entries[$section] ?? [])) {
            return $this->entries[$section][$title];
        }

        $url = $this->search(['title' => $title, 'author' => $author])
            ?? (isset(FALLBACK_SEARCHES[$title]) ? $this->search(['q' => FALLBACK_SEARCHES[$title]]) : null);

        $this->entries[$section][$title] = $url;

        return $url;
    }

    public function save(): void
    {
        ksort($this->entries);

        foreach (array_keys($this->entries) as $section) {
            ksort($this->entries[$section]);
        }

        File::ensureDirectoryExists(dirname($this->path));
        File::put($this->path, json_encode($this->entries, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).PHP_EOL);
    }

    /**
     * @param  array<string, string>  $query
     */
    private function search(array $query): ?string
    {
        $docs = Http::timeout(40)->retry(2, 1000, throw: false)
            ->get(self::SEARCH_URL, $query + ['limit' => 5, 'fields' => 'cover_i'])
            ->json('docs') ?? [];

        $coverId = collect($docs)->pluck('cover_i')->filter()->first();

        return $coverId === null ? null : sprintf(self::COVER_URL, $coverId);
    }
}

function bookTitled(string $title): Book
{
    return Book::query()->where('title', $title)->firstOrFail();
}

function addExtraBooks(): void
{
    foreach ([['A Hora da Estrela', 'Clarice Lispector', 88, 'Ficção'], ['Vidas Secas', 'Graciliano Ramos', 176, 'Ficção']] as [$title, $author, $pages, $genre]) {
        $book = Book::factory()->withAuthors([$author])->create(['title' => $title, 'pages' => $pages, 'genre' => $genre]);

        Reading::factory()->for($book)->create([
            'status' => ReadingStatus::WantToRead,
            'started_at' => null,
            'finished_at' => null,
            'rating' => null,
            'current_page' => 0,
        ]);
    }
}

/**
 * @return array<int, string|null> Cover URL of each book id, as downloaded.
 */
function applyEditionsAndCovers(CoverCatalog $covers): array
{
    $bookCovers = [];

    foreach (Book::with('authors')->orderBy('id')->get() as $book) {
        [$publisher, $year] = EDITIONS[$book->title];
        $book->update(['publisher' => $publisher, 'published_year' => $year]);

        $url = $covers->coverFor('books', $book->title, $book->authors->first()->name);

        if ($url !== null && ! app(CoverStore::class)->download($book, $url)) {
            throw new RuntimeException("Cover download failed for {$book->title}: {$url}");
        }

        $bookCovers[$book->id] = $url;
    }

    return $bookCovers;
}

/**
 * The seeded history ends on 2026-10-14; move it so it ends on the fixed "today".
 */
function shiftReadingDatesToToday(): void
{
    $shift = (int) Carbon::parse(SEED_LAST_DAY)->diffInDays(today());

    foreach (ReadingSession::all() as $session) {
        $session->update(['read_on' => $session->read_on->addDays($shift)]);
    }

    foreach (Reading::all() as $reading) {
        $reading->update([
            'started_at' => $reading->started_at?->addDays($shift),
            'finished_at' => $reading->finished_at?->addDays($shift),
        ]);
    }
}

function addCurrentReadingSessions(): void
{
    $current = bookTitled('Memórias Póstumas de Brás Cubas')->currentReading;
    $page = $current->current_page;

    foreach ([3 => 9, 2 => 14, 1 => 11, 0 => 22] as $daysAgo => $pages) {
        $current->sessions()->create([
            'read_on' => today()->subDays($daysAgo),
            'page_from' => $page + 1,
            'page_to' => $page + $pages,
            'minutes' => $pages * 2,
        ]);
        $page += $pages;
    }

    $current->update(['current_page' => $page]);
}

function addTortoAradoDetails(): void
{
    $torto = bookTitled('Torto Arado');
    $torto->update(['description' => 'Duas irmãs, Bibiana e Belonísia, têm a vida ligada para sempre por um acidente na infância, no sertão da Chapada Diamantina.']);
    $torto->currentReading->update(['review' => "As duas vozes se completam. A terra é a personagem que mais fica.\n\nVoltaria pela terceira parte."]);

    Note::create(['book_id' => $torto->id, 'page' => 13, 'kind' => 'excerpt', 'body_md' => 'A abertura com a faca já entrega o tom do livro inteiro. #abertura']);
    Note::create(['book_id' => $torto->id, 'page' => 140, 'kind' => 'reflection', 'body_md' => 'A mudança de narradora reorganiza tudo o que eu tinha entendido. #narrador']);
}

function addQueue(): void
{
    foreach (['Duna', 'A Hora da Estrela', 'Vidas Secas'] as $title) {
        app(QueueService::class)->add(bookTitled($title));
    }
}

function addShoppingItems(CoverCatalog $covers): void
{
    foreach ([
        ['Salvar o fogo', 'Itamar Vieira Junior', 5990, true],
        ['Grande Sertão: Veredas', 'João Guimarães Rosa', 8990, false],
        ['O Silmarillion', 'J. R. R. Tolkien', 6490, false],
        ['Quincas Borba', 'Machado de Assis', 3290, false],
    ] as [$title, $author, $cents, $priority]) {
        ShoppingItem::create([
            'title' => $title,
            'author' => $author,
            'cover_url' => $covers->coverFor('shopping_items', $title, $author),
            'store_type' => 'online',
            'is_priority' => $priority,
            'estimated_price_cents' => $cents,
            'price_checked_at' => now(),
        ]);
    }
}

/**
 * Open Library work keys, checked on openlibrary.org. A suggestion without one shows no "choose edition" button.
 */
const RECOMMENDATION_WORK_KEYS = [
    'Messias de Duna' => 'OL893461W',
    'Salvar o fogo' => 'OL39580661W',
    'Homo Deus' => 'OL37486679W',
    'O Silmarillion' => 'OL46058377W',
];

function addRecommendations(CoverCatalog $covers): void
{
    foreach ([
        ['Messias de Duna', 'Frank Herbert', 'Duna', 'mesmo autor que Duna, que você quer ler'],
        ['Salvar o fogo', 'Itamar Vieira Junior', 'Torto Arado', 'mesmo autor que Torto Arado'],
        ['Quem tem medo do feminismo negro?', 'Djamila Ribeiro', 'Pequeno Manual Antirracista', 'mesmo autor que Pequeno Manual Antirracista'],
        ['Homo Deus', 'Yuval Noah Harari', 'Sapiens', 'mesmo autor que Sapiens'],
        ['O Silmarillion', 'J. R. R. Tolkien', 'O Hobbit', 'mesmo autor que O Hobbit'],
    ] as [$title, $author, $basedOn, $reason]) {
        Recommendation::create([
            'title' => $title,
            'author' => $author,
            'cover_url' => $covers->coverFor('recommendations', $title, $author),
            'work_key' => RECOMMENDATION_WORK_KEYS[$title] ?? null,
            'reason' => $reason,
            'based_on_book_id' => bookTitled($basedOn)->id,
            'status' => 'new',
        ]);
    }
}

function organizeBookcase(): void
{
    $bookcase = app(Bookcase::class);
    $groups = collect($bookcase->groups(ShelfGrouping::Genre));

    $bookcase->organize(
        ShelfGrouping::Genre,
        $groups->take(3)->map(fn (array $group) => ['name' => $group['label'], 'group_keys' => [$group['key']]])->all(),
        'Outros',
    );
}

function setProfile(): void
{
    $profile = app(ProfileService::class);
    $profile->updateReader('Marina', 'Leio um pouco todo dia, de preferência literatura brasileira.');

    foreach (['Torto Arado', 'Pequeno Manual Antirracista', 'O Hobbit'] as $title) {
        $profile->pin(bookTitled($title));
    }
}

/**
 * @return list<string>
 */
function exportedTableNames(): array
{
    $names = array_map(
        fn (object $table) => $table->name,
        DB::select("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name"),
    );

    $names = array_values(array_diff($names, EXCLUDED_TABLES));

    return [...array_intersect(['books', 'authors'], $names), ...array_values(array_diff($names, ['books', 'authors']))];
}

/**
 * @param  array<int, string|null>  $bookCovers
 * @return array{exported_on: string, tables: array<string, list<array<string, mixed>>>}
 */
function exportState(array $bookCovers): array
{
    $tables = [];

    foreach (exportedTableNames() as $table) {
        $tables[$table] = DB::table($table)->orderBy('rowid')->get()
            ->map(fn (object $row) => (array) $row)
            ->all();
    }

    $tables['books'] = array_map(
        fn (array $row) => [...$row, 'cover_url' => $bookCovers[$row['id']] ?? null],
        $tables['books'],
    );

    $tables['authors'] = array_map(function (array $row): array {
        if ($row['photo_path'] !== null) {
            throw new RuntimeException("Author {$row['name']} has a local photo without a remote URL.");
        }

        return [...$row, 'photo_url' => null];
    }, $tables['authors']);

    foreach (['shopping_items', 'recommendations'] as $table) {
        foreach ($tables[$table] as $row) {
            if ($row['cover_url'] !== null && ! str_starts_with($row['cover_url'], 'https://')) {
                throw new RuntimeException("Cover of {$table} #{$row['id']} is not a remote https URL.");
            }
        }
    }

    return ['exported_on' => today()->toDateString(), 'tables' => $tables];
}

function writeState(array $state): void
{
    File::ensureDirectoryExists(DEMO_DATA_PATH);
    File::put(DEMO_DATA_PATH.'/state.json', json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).PHP_EOL);
}

$app = bootstrapDemoApplication();
// Pinned covers only need a stored file to point at: the demo serves the remote URL, so the image itself is never fetched.
Http::fake(['*covers.openlibrary.org/*' => Http::response(str_repeat("\0", 2048), 200, ['Content-Type' => 'image/jpeg'])]);
$app->make(DemoSeeder::class)->run();

$covers = new CoverCatalog(DEMO_DATA_PATH.'/covers.json');

addExtraBooks();
$bookCovers = applyEditionsAndCovers($covers);
shiftReadingDatesToToday();
addCurrentReadingSessions();
addTortoAradoDetails();
addQueue();
addShoppingItems($covers);
addRecommendations($covers);
organizeBookcase();
setProfile();
Setting::put('daily_goal', 20);

$covers->save();
writeState(exportState($bookCovers));

echo 'seeded', PHP_EOL;
