<?php

declare(strict_types=1);

require __DIR__.'/support.php';
require __DIR__.'/inertia.php';
require __DIR__.'/scenario_runner.php';

use App\Enums\Locale;
use App\Enums\NoteKind;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Setting;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

$scenarios = [
    'live-session' => function (ScenarioRunner $run): void {
        $title = 'Memórias Póstumas de Brás Cubas';
        $bookId = $run->bookId($title);
        $start = $run->currentPage($title);

        $run->step('start', 'POST', "/library/{$bookId}/live-session", null, ['live-session', 'home']);
        $run->step('move-page', 'PATCH', '/live-session/page', ['page' => $start + 12], ['live-session']);
        $run->step('pause', 'POST', '/live-session/pause', null, ['live-session']);
        $run->advance(5);
        $run->step('resume', 'POST', '/live-session/resume', null, ['live-session']);
        $run->advance(20);
        $run->step('finish', 'POST', '/live-session/finish', ['finish_book' => false], ['home', 'stats', 'timeline']);
    },

    'quick-log' => function (ScenarioRunner $run): void {
        $reading = 'Memórias Póstumas de Brás Cubas';
        $readingBook = $run->bookId($reading);
        $readingPage = $run->currentPage($reading);
        $refactoring = 'Refactoring';
        $refactoringBook = $run->bookId($refactoring);
        $refactoringPage = $run->currentPage($refactoring);

        $run->step('register-pages', 'POST', '/quick-log', ['book_id' => $readingBook, 'page_to' => $readingPage + 8, 'minutes' => 20], ['home', "book-{$readingBook}"]);
        $run->step('timer-start', 'POST', '/quick-log/timer', ['book_id' => $refactoringBook, 'start_page' => $refactoringPage], ['home']);
        $run->advance(25);
        $run->step('timer-finish', 'POST', '/quick-log/timer/finish', ['page_to' => $refactoringPage + 15], ['home', "book-{$refactoringBook}"]);
        $run->step('finish-book', 'POST', '/quick-log', ['book_id' => $refactoringBook, 'page_to' => 448, 'minutes' => 25], ['home', "book-{$refactoringBook}", 'timeline', 'stats']);
    },

    'finish-reading' => function (ScenarioRunner $run): void {
        $refactoring = $run->bookId('Refactoring');
        $memorias = $run->bookId('Memórias Póstumas de Brás Cubas');
        $sapiens = $run->bookId('Sapiens');
        $duna = $run->bookId('Duna');
        $torto = $run->bookId('Torto Arado');
        $dom = $run->bookId('Dom Casmurro');

        $run->step('finish', 'POST', '/readings/'.$run->currentReadingId('Refactoring').'/finish', ['finished_on' => '2026-11-26', 'undated' => false, 'rating' => 4, 'line' => 'Leitura útil para revisar hábitos de código.'], ['home', 'library', 'timeline', 'stats']);
        $run->step('review', 'PATCH', "/library/{$refactoring}/reading", ['review' => "Capítulos curtos e exemplos claros.\n\nVale reler antes de refatorar um legado."], ["book-{$refactoring}"]);
        $run->step('abandon', 'POST', '/readings/'.$run->currentReadingId('Memórias Póstumas de Brás Cubas').'/abandon', ['reason' => 'Perdi o ritmo', 'rating' => null], ['home', 'library', "book-{$memorias}"]);
        $run->step('reopen', 'POST', '/readings/'.$run->currentReadingId('Sapiens').'/reopen', null, ['home', 'library', "book-{$sapiens}"]);
        $run->step('start-want-to-read', 'POST', "/library/{$duna}/start", null, ['home', 'library', "book-{$duna}", 'queue']);
        $run->step('reread', 'POST', "/library/{$torto}/reread", ['status' => 'reading'], ['home', 'library', "book-{$torto}", 'timeline']);
        $run->step('change-rating', 'PATCH', "/library/{$dom}/reading", ['rating' => 5], ["book-{$dom}", 'stats']);
    },

    'queue' => function (ScenarioRunner $run): void {
        $run->step('open', 'GET', '/queue', null, ['home']);
        $run->step('add-book', 'POST', '/queue/books', ['book_id' => $run->bookId('Clean Code')], ['home', 'library']);
        $added = $run->queueItemId('Clean Code');
        $order = array_reverse($run->queueOrder());
        $run->step('reorder', 'PATCH', '/queue/order', ['ids' => $order], ['home']);
        $run->step('remove', 'DELETE', "/queue/{$added}", null, ['home', 'library']);
    },

    'shopping' => function (ScenarioRunner $run): void {
        $run->step('open', 'GET', '/shopping', null, ['home']);
        $run->step('add', 'POST', '/shopping', ['title' => 'Pedro Páramo', 'author' => 'Juan Rulfo', 'isbn' => '', 'cover_url' => '', 'url' => '', 'store_type' => 'bookstore', 'estimated_price' => '42,50'], ['shopping']);
        $pedro = $run->shoppingId('Pedro Páramo');
        $run->step('toggle-priority', 'PATCH', "/shopping/{$pedro}/priority", ['is_priority' => true], ['shopping']);
        $run->step('edit-price', 'PATCH', "/shopping/{$pedro}", ['estimated_price' => '38,90'], ['shopping']);
        $run->step('buy', 'POST', "/shopping/{$pedro}/buy", null, ['shopping', 'queue', 'library']);
        $run->step('unbuy', 'POST', "/shopping/{$pedro}/unbuy", null, ['shopping', 'queue']);
        $run->step('sort-preference', 'PUT', '/shopping/preference', ['queue_on_buy' => false], ['shopping']);
        $run->step('sort-price-asc', 'GET', '/shopping?sort=price_asc', null, ['shopping']);
        $run->step('add-second', 'POST', '/shopping', ['title' => 'Vidas Secas', 'author' => 'Graciliano Ramos', 'isbn' => '', 'cover_url' => '', 'url' => '', 'store_type' => 'used_bookstore', 'estimated_price' => '29,90'], ['shopping']);
        $run->step('bulk-buy', 'POST', '/shopping/buy', ['ids' => [$run->shoppingId('Quincas Borba'), $run->shoppingId('O Silmarillion')]], ['shopping', 'queue']);
        $run->step('bulk-delete', 'DELETE', '/shopping', ['ids' => [$run->shoppingId('Grande Sertão: Veredas'), $run->shoppingId('Vidas Secas')]], ['shopping']);
        $run->step('delete', 'DELETE', '/shopping/'.$run->shoppingId('Salvar o fogo'), null, ['shopping']);
    },

    'suggestions' => function (ScenarioRunner $run): void {
        $run->step('open', 'GET', '/suggestions', null, ['home']);
        $run->step('accept', 'PATCH', '/suggestions/'.$run->recommendationId('Messias de Duna').'/accept', null, ['suggestions', 'library', 'queue']);
        $run->step('already-read', 'PATCH', '/suggestions/'.$run->recommendationId('Salvar o fogo').'/already-read', null, ['suggestions', 'library']);
        $run->step('dismiss', 'PATCH', '/suggestions/'.$run->recommendationId('Homo Deus').'/dismiss', null, ['suggestions']);
    },

    'add-book' => function (ScenarioRunner $run): void {
        $run->step('open', 'GET', '/library/add', null, ['library']);
        $run->step('want-to-read', 'POST', '/library', [
            'title' => 'Livro Demo Quero Ler', 'subtitle' => '', 'authors' => 'Autora Exemplo, Outro Autor', 'isbn_13' => '',
            'publisher' => 'Editora Demo', 'published_year' => '2019', 'series' => '', 'series_position' => '', 'pages' => '210',
            'genre' => 'Ensaio', 'description' => 'Ensaio de teste.', 'cover_url' => '', 'source' => 'manual',
            'status' => 'want_to_read', 'finished_on' => '', 'undated' => false,
        ], ['library', 'home', 'queue']);
        $run->step('already-read', 'POST', '/library', [
            'title' => 'Livro Demo Lido', 'subtitle' => '', 'authors' => 'Autora Exemplo', 'isbn_13' => '',
            'publisher' => 'Editora Demo', 'published_year' => '2018', 'series' => '', 'series_position' => '', 'pages' => '150',
            'genre' => 'Romance', 'description' => '', 'cover_url' => '', 'source' => 'manual',
            'status' => 'read', 'finished_on' => '2026-11-20', 'undated' => false,
        ], ['library', 'home', 'timeline', 'stats']);
    },

    'sessions-notes' => function (ScenarioRunner $run): void {
        $title = 'Refactoring';
        $book = $run->bookId($title);
        $page = $run->currentPage($title);

        $run->step('open-book', 'GET', "/library/{$book}", null, ['home']);
        $run->step('session-store', 'POST', "/library/{$book}/sessions", ['page_to' => $page + 15, 'minutes' => 30], ["book-{$book}"]);
        $session = $run->latestSession($title);
        $run->step('session-update', 'PATCH', "/sessions/{$session['id']}", ['read_on' => $session['read_on'], 'page_to' => $session['page_to'] + 5, 'minutes' => 35], ["book-{$book}", 'stats']);
        $run->step('session-delete', 'DELETE', "/sessions/{$session['id']}", null, ["book-{$book}", 'stats']);
        $run->step('note-store', 'POST', '/notes', ['book_id' => $book, 'kind' => NoteKind::Reflection->value, 'page' => 100, 'body_md' => 'Anotação de teste.'], ["book-{$book}"]);
        $note = $run->noteId($title);
        $run->step('note-update', 'PATCH', "/notes/{$note}", ['book_id' => $book, 'kind' => NoteKind::Reflection->value, 'page' => 101, 'body_md' => 'Anotação revisada.'], ["book-{$book}"]);
        $run->step('note-delete', 'DELETE', "/notes/{$note}", null, ["book-{$book}"]);
        $run->step('goal', 'PUT', '/goal', ['yearly_goal' => '15', 'daily_goal' => '25'], ['home', 'stats']);
    },

    'undo' => function (ScenarioRunner $run): void {
        $title = 'Torto Arado';
        $book = $run->bookId($title);

        $run->step('open-book', 'GET', "/library/{$book}", null, ['home']);
        $run->step('note-delete', 'DELETE', '/notes/'.$run->noteId($title), null, ["book-{$book}"]);
        $run->step('undo', 'POST', '/undo/'.$run->undoToken(), null, ["book-{$book}", 'home']);
    },
];

$app = bootstrapDemoApplication();
Http::fake([
    '*covers.openlibrary.org/*' => Http::response(str_repeat("\0", 2048), 200, ['Content-Type' => 'image/jpeg']),
    '*' => Http::response('', 503),
]);

$kernel = $app->make(Kernel::class);
$version = (string) $app->make(HandleInertiaRequests::class)->version(Request::create('/'));
$remote = remoteUrlsFromState();
$seededDatabase = dirname((string) config('database.connections.sqlite.database')).'/seeded.sqlite';

$stepsByLocale = [];

foreach (LOCALE_DIRECTORIES as $locale => $directory) {
    $stepsByLocale[$locale] = [];

    foreach ($scenarios as $name => $scenario) {
        $database = dirname($seededDatabase)."/scenario-{$locale}-{$name}.sqlite";
        File::copy($seededDatabase, $database);
        config(['database.connections.sqlite.database' => $database]);
        DB::purge('sqlite');
        assertThrowawayEnvironment();

        Carbon::setTestNow(DEMO_FIXED_NOW);
        CarbonImmutable::setTestNow(DEMO_FIXED_NOW);
        Setting::put(Locale::SETTING, $locale);

        $directoryPath = DEMO_GOLDEN_PATH."/{$directory}/scenarios/{$name}";
        File::deleteDirectory($directoryPath);
        File::ensureDirectoryExists($directoryPath);

        $client = new InertiaClient($kernel, $version);
        $client->send('GET', '/');

        $runner = new ScenarioRunner($client, $directoryPath, $remote);
        $scenario($runner);
        $stepsByLocale[$locale][$name] = $runner->steps();
    }
}

if ($stepsByLocale['pt_BR'] !== $stepsByLocale['en']) {
    throw new RuntimeException('The scenario steps differ between locales.');
}

File::put(DEMO_GOLDEN_PATH.'/scenarios.json', json_encode($stepsByLocale['pt_BR'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR).PHP_EOL);

echo 'scenarios: ', implode(', ', array_map(fn (array $steps) => count($steps), $stepsByLocale['pt_BR'])), PHP_EOL;
