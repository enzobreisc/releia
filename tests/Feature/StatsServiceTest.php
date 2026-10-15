<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Models\Setting;
use App\Services\StatsService;
use App\Support\StatsPeriod;
use Illuminate\Support\Carbon;

/*
 * Amostra pequena com contas feitas à mão. Hoje é 14/10/2026 (287 dias decorridos no ano).
 *
 * Livros concluídos em 2026: A1 (10 a 14/01, 5 dias), B1 (01 a 31/03, 31 dias, sem sessões),
 * C1 (30/03, 1 dia) e A2 (releitura de A, 01 a 02/06, 2 dias). Total: 4.
 * Páginas: sessões somam 470 (A1 200, A2 40, C1 150, D 70, E 10) + B1 sem sessão (300) = 770.
 * Dias com sessão: 10 datas distintas. Sequência maior: 3 (10 a 12/01). Atual: 2 (13 e 14/10).
 */
beforeEach(function () {
    Carbon::setTestNow('2026-10-14 12:00:00');
});

/** @return array<string, Reading> */
function statsSample2026(): array
{
    $a = Book::factory()->withAuthors(['Ana'])->create(['title' => 'Livro A', 'pages' => 200, 'genre' => 'Romance']);
    $b = Book::factory()->withAuthors(['Bruno'])->create(['title' => 'Livro B', 'pages' => 300, 'genre' => 'Ficção']);
    $c = Book::factory()->withAuthors(['Ana', 'Carla'])->create(['title' => 'Livro C', 'pages' => 150, 'genre' => 'Romance']);
    $d = Book::factory()->withAuthors(['Dário'])->create(['title' => 'Livro D', 'pages' => 400, 'genre' => 'Tecnologia']);
    $e = Book::factory()->withAuthors(['Elisa'])->create(['title' => 'Livro E', 'pages' => 250, 'genre' => 'História']);
    $f = Book::factory()->withAuthors(['Fábio'])->create(['title' => 'Livro F', 'pages' => 100, 'genre' => 'Romance']);

    $readings = [
        'a1' => statsReading($a, ReadingStatus::Lido, '2026-01-10', '2026-01-14', 5),
        'a2' => statsReading($a, ReadingStatus::Lido, '2026-06-01', '2026-06-02', 5),
        'b1' => statsReading($b, ReadingStatus::Lido, '2026-03-01', '2026-03-31', 3),
        'c1' => statsReading($c, ReadingStatus::Lido, '2026-03-30', '2026-03-30', 4),
        'd1' => statsReading($d, ReadingStatus::Lendo, '2026-08-01', null),
        'e1' => statsReading($e, ReadingStatus::Abandonado, '2026-02-01', '2026-02-05'),
        'f1' => statsReading($f, ReadingStatus::Lido, '2025-12-20', '2025-12-31', 2),
    ];

    statsSession($readings['a1'], '2026-01-10', 1, 50);
    statsSession($readings['a1'], '2026-01-11', 51, 100);
    statsSession($readings['a1'], '2026-01-12', 101, 150);
    statsSession($readings['a1'], '2026-01-14', 151, 200);
    statsSession($readings['a2'], '2026-06-01', 1, 40);
    statsSession($readings['c1'], '2026-03-30', 1, 150);
    statsSession($readings['d1'], '2026-08-01', 1, 30);
    statsSession($readings['d1'], '2026-10-13', 31, 50);
    statsSession($readings['d1'], '2026-10-14', 51, 70);
    statsSession($readings['e1'], '2026-02-01', 1, 10);

    return $readings;
}

function statsReading(Book $book, ReadingStatus $status, string $start, ?string $end, ?int $rating = null): Reading
{
    return Reading::factory()->for($book)->create([
        'status' => $status,
        'started_at' => $start,
        'finished_at' => $end,
        'rating' => $rating,
    ]);
}

function statsSession(Reading $reading, string $day, int $from, int $to): ReadingSession
{
    return ReadingSession::factory()->for($reading)->create([
        'read_on' => $day,
        'page_from' => $from,
        'page_to' => $to,
        'minutes' => null,
    ]);
}

test('indicadores do ano batem com o cálculo manual', function () {
    statsSample2026();

    expect(app(StatsService::class)->indicators(StatsPeriod::year(2026)))->toBe([
        'books_read' => 4,
        'pages_read' => 770,
        'pages_per_day' => 2.7,                  // 770 ÷ 287 dias decorridos
        'pages_per_reading_day' => 47.0,         // 470 de sessão ÷ 10 dias com leitura
        'reading_days' => 10,
        'days_per_book' => 9.8,                  // (5 + 31 + 1 + 2) ÷ 4 = 9,75
    ]);
});

test('leitura sem sessão usa as páginas do livro concluído', function () {
    $book = Book::factory()->create(['pages' => 180]);
    statsReading($book, ReadingStatus::Lido, '2026-05-01', '2026-05-10');

    $indicators = app(StatsService::class)->indicators(StatsPeriod::year(2026));

    expect($indicators['pages_read'])->toBe(180)
        ->and($indicators['reading_days'])->toBe(0)
        ->and($indicators['pages_per_reading_day'])->toBeNull();
});

test('releitura conta cada leitura como um livro lido', function () {
    statsSample2026();
    $service = app(StatsService::class);

    // Livro A foi lido duas vezes em 2026 (a1 e a2): as duas contam.
    expect($service->indicators(StatsPeriod::year(2026))['books_read'])->toBe(4)
        ->and($service->authors(StatsPeriod::year(2026))[0])->toBe(['label' => 'Ana', 'count' => 3]);
});

test('o ano filtra pelas datas de fim e de sessão', function () {
    statsSample2026();
    $service = app(StatsService::class);

    // f1 terminou em 31/12/2025: entra em 2025 e fica fora de 2026.
    $year2025 = $service->indicators(StatsPeriod::year(2025));

    expect($year2025['books_read'])->toBe(1)
        ->and($year2025['pages_read'])->toBe(100);

    // Sessão com hora em 31/12/2026 ainda conta no ano.
    $reading = Reading::query()->where('status', ReadingStatus::Lendo)->first();
    ReadingSession::factory()->for($reading)->create([
        'read_on' => Carbon::parse('2026-12-31 18:00:00'),
        'page_from' => 1,
        'page_to' => 10,
        'minutes' => null,
    ]);

    expect($service->indicators(StatsPeriod::year(2026))['pages_read'])->toBe(780);
});

test('gêneros e autores são contados por livros concluídos', function () {
    statsSample2026();
    $service = app(StatsService::class);
    $period = StatsPeriod::year(2026);

    expect($service->genres($period))->toBe([
        ['label' => 'Romance', 'count' => 3],
        ['label' => 'Ficção', 'count' => 1],
    ])->and($service->authors($period))->toBe([
        ['label' => 'Ana', 'count' => 3],
        ['label' => 'Bruno', 'count' => 1],
        ['label' => 'Carla', 'count' => 1],
    ]);
});

test('mais rápido, mais longo e melhor mês', function () {
    statsSample2026();
    $service = app(StatsService::class);
    $period = StatsPeriod::year(2026);

    $extremes = $service->extremes($period);

    expect($extremes['fastest']->book->title)->toBe('Livro C')   // 1 dia
        ->and($extremes['longest']->book->title)->toBe('Livro B') // 300 páginas
        ->and($service->bestMonth($period))->toBe(['month' => '2026-03', 'count' => 2]);
});

test('sequência atual e maior', function () {
    statsSample2026();

    expect(app(StatsService::class)->streaks(StatsPeriod::year(2026)))->toBe([
        'current' => 2, // 13 e 14/10
        'longest' => 3, // 10 a 12/01
    ]);
});

test('sequência atual vale até ontem quando hoje não teve leitura', function () {
    $reading = statsReading(Book::factory()->create(), ReadingStatus::Lendo, '2026-10-01', null);
    statsSession($reading, '2026-10-12', 1, 10);
    statsSession($reading, '2026-10-13', 11, 20);

    expect(app(StatsService::class)->streaks(StatsPeriod::year(2026))['current'])->toBe(2);
});

test('livros por mês com zeros e a previsão do ano', function () {
    statsSample2026();
    Setting::put('yearly_goal', 12);
    $service = app(StatsService::class);

    $counts = array_column($service->booksPerBucket(StatsPeriod::year(2026)), 'count');

    expect($counts)->toBe([1, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0])
        // 4 livros ÷ 287 dias × 365 = 5,02; meta 12.
        ->and($service->forecast(StatsPeriod::year(2026)))->toBe(['projection' => 5, 'goal' => 12, 'books' => 4])
        ->and($service->forecast(StatsPeriod::year(2025)))->toBeNull();
});

test('mapa de calor marca os níveis pelas páginas do dia', function () {
    statsSample2026();

    $days = collect(app(StatsService::class)->heatmap(StatsPeriod::year(2026)))->keyBy('date');

    expect($days)->toHaveCount(365)
        ->and($days['2026-01-10'])->toMatchArray(['pages' => 50, 'level' => 3])
        ->and($days['2026-02-01'])->toMatchArray(['pages' => 10, 'level' => 1])
        ->and($days['2026-03-30'])->toMatchArray(['pages' => 150, 'level' => 4])
        ->and($days['2026-06-01'])->toMatchArray(['pages' => 40, 'level' => 2])
        ->and($days['2026-03-01'])->toMatchArray(['pages' => 0, 'level' => 0]);
});

test('níveis do mapa de calor nos limiares', function (int $pages, int $level) {
    expect(StatsService::heatLevel($pages))->toBe($level);
})->with([
    [0, 0],
    [1, 1],
    [20, 1],
    [21, 2],
    [40, 2],
    [41, 3],
    [70, 3],
    [71, 4],
]);

test('melhores leituras do ano pela nota, com desempate por páginas e data', function () {
    $readings = statsSample2026();

    $top = app(StatsService::class)->topRated(StatsPeriod::year(2026));

    // A2 e A1 têm nota 5 e 200 páginas; A2 é mais recente, então vem primeiro.
    expect($top->pluck('id')->all())->toBe([
        $readings['a2']->id,
        $readings['a1']->id,
        $readings['c1']->id,
        $readings['b1']->id,
    ]);
});

test('o Wrapped junta as métricas do ano', function () {
    statsSample2026();

    $wrapped = app(StatsService::class)->wrapped(2026);

    expect($wrapped['indicators']['books_read'])->toBe(4)
        ->and($wrapped['genre'])->toBe(['label' => 'Romance', 'count' => 3])
        ->and($wrapped['author'])->toBe(['label' => 'Ana', 'count' => 3])
        ->and($wrapped['streak']['longest'])->toBe(3)
        ->and($wrapped['best_month'])->toBe(['month' => '2026-03', 'count' => 2]);
});

test('os anos disponíveis vão do primeiro registro até o ano atual', function () {
    statsSample2026();

    expect(app(StatsService::class)->years())->toBe([2026, 2025]);
});

test('estatísticas sem dados nenhum não quebram', function () {
    $service = app(StatsService::class);
    $period = StatsPeriod::year(2026);

    expect($service->indicators($period))->toMatchArray([
        'books_read' => 0,
        'pages_read' => 0,
        'days_per_book' => null,
    ])
        ->and($service->bestMonth($period))->toBeNull()
        ->and($service->extremes($period))->toBe(['fastest' => null, 'longest' => null])
        ->and($service->streaks($period))->toBe(['current' => 0, 'longest' => 0])
        ->and($service->topRated($period))->toHaveCount(0);
});
