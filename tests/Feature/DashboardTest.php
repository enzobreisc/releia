<?php

use App\Enums\ReadingStatus;
use App\Events\QuickLogShortcutPressed;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Models\Setting;
use App\Native\QuickLog;
use App\Services\DashboardService;
use App\Services\ReadingActivity;
use App\Services\ReadingService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Native\Desktop\Facades\GlobalShortcut;
use Native\Desktop\MenuBar\MenuBarManager;

beforeEach(function () {
    Carbon::setTestNow('2026-10-14 22:30:00');
});

function sessionOn(string $day, int $pageFrom, int $pageTo, ?Reading $reading = null): ReadingSession
{
    $reading ??= Book::factory()->onShelf(ReadingStatus::Reading)->create()->currentReading;

    return $reading->sessions()->create([
        'read_on' => $day,
        'page_from' => $pageFrom,
        'page_to' => $pageTo,
        'minutes' => null,
    ]);
}

test('sequência conta dias seguidos e mantém hoje sem leitura até o fim do dia', function () {
    $today = Carbon::today();

    expect(ReadingActivity::streak(['2026-10-12', '2026-10-13'], $today))
        ->toBe(['current' => 2, 'longest' => 2]);

    // Today has no session yet: yesterday's streak still counts.
    expect(ReadingActivity::streak(['2026-10-11', '2026-10-13'], $today))
        ->toBe(['current' => 1, 'longest' => 1]);

    // Two days without reading break the current streak, but the longest one is kept.
    expect(ReadingActivity::streak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-09'], $today))
        ->toBe(['current' => 0, 'longest' => 3]);

    expect(ReadingActivity::streak([], $today))->toBe(['current' => 0, 'longest' => 0]);
});

test('o nível do mapa de calor cresce com as páginas do dia', function (int $pages, int $level) {
    expect(ReadingActivity::level($pages))->toBe($level);
})->with([[0, 0], [1, 1], [20, 1], [21, 2], [40, 2], [41, 3], [70, 3], [71, 4], [500, 4]]);

test('páginas por dia somam todas as leituras e a última semana tem sete níveis', function () {
    sessionOn('2026-10-14', 1, 25);
    sessionOn('2026-10-14', 26, 30);
    sessionOn('2026-10-10', 1, 90);
    sessionOn('2026-10-01', 1, 10);

    $activity = app(ReadingActivity::class);

    expect($activity->pagesByDay(Carbon::today()->subDays(6), Carbon::today()))
        ->toBe(['2026-10-10' => 90, '2026-10-14' => 30])
        ->and($activity->lastWeekLevels(Carbon::today()))->toBe([0, 0, 4, 0, 0, 0, 2]);
});

test('meta do ano: previsão linear pelos dias passados', function () {
    Setting::put('yearly_goal', 24);

    // 14 October is day 287 of 2026, a 365-day year.
    Book::factory()->onShelf(ReadingStatus::Read)->create()
        ->currentReading->update(['finished_at' => '2026-03-01']);
    Book::factory()->onShelf(ReadingStatus::Read)->create()
        ->currentReading->update(['finished_at' => '2026-10-02']);
    Book::factory()->onShelf(ReadingStatus::Read)->create()
        ->currentReading->update(['finished_at' => '2025-12-30']);

    expect(app(DashboardService::class)->yearGoal(Carbon::today()))
        ->toBe(['year' => 2026, 'goal' => 24, 'finished' => 2, 'projected' => 3]);
});

test('meta do ano sem valor definido fica nula', function () {
    expect(app(DashboardService::class)->yearGoal(Carbon::today()))
        ->toMatchArray(['goal' => null, 'finished' => 0, 'projected' => 0]);
});

test('a meta é salva em settings e valida o intervalo', function () {
    $this->put(route('goal.update'), ['yearly_goal' => 30])->assertRedirect();

    expect(Setting::get('yearly_goal'))->toBe(30);

    $this->put(route('goal.update'), ['yearly_goal' => 0])->assertSessionHasErrors('yearly_goal');
});

test('a meta diária é opcional, validada e limpa quando o campo fica vazio', function () {
    $this->put(route('goal.update'), ['yearly_goal' => 30, 'daily_goal' => 25])->assertRedirect();

    expect(Setting::get('daily_goal'))->toBe(25)
        ->and(app(DashboardService::class)->dailyGoal())->toBe(25);

    $this->put(route('goal.update'), ['yearly_goal' => 30, 'daily_goal' => 0])->assertSessionHasErrors('daily_goal');

    $this->put(route('goal.update'), ['yearly_goal' => 30, 'daily_goal' => ''])->assertRedirect();

    expect(app(DashboardService::class)->dailyGoal())->toBeNull();
});

test('início lista leituras em andamento, meta e últimos terminados', function () {
    Book::factory()->onShelf(ReadingStatus::Reading)->create(['title' => 'Em curso', 'pages' => 200]);
    Book::factory()->onShelf(ReadingStatus::Read)->create(['title' => 'Terminado'])
        ->currentReading->update(['finished_at' => '2026-10-01']);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('home')
            ->has('reading', 1)
            ->where('reading.0.title', 'Em curso')
            ->where('goal.goal', null)
            ->where('recent.0.title', 'Terminado'));
});

test('início mostra o dia, a sessão em andamento, o próximo da fila e as datas dos terminados', function () {
    Setting::put('daily_goal', 30);
    $reading = Book::factory()->onShelf(ReadingStatus::Reading)->create(['title' => 'Em curso', 'pages' => 200]);
    Book::factory()->onShelf(ReadingStatus::Read)->create(['title' => 'Terminado'])
        ->currentReading->update(['started_at' => '2026-09-10', 'finished_at' => '2026-09-27']);
    $next = Book::factory()->create(['title' => 'Próximo', 'pages' => 176]);
    QueueItem::create(['book_id' => $next->id, 'position' => 1, 'added_at' => now()]);
    $this->post(route('live-session.start', $reading))->assertRedirect();

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('today.goal', 30)
            ->where('today.pages', 0)
            ->has('today.week', 7)
            ->where('live_session.title', 'Em curso')
            ->where('live_session.timer.paused', false)
            ->where('next_in_queue.title', 'Próximo')
            ->where('next_in_queue.pages', 176)
            ->where('next_in_queue.position', 1)
            ->where('next_in_queue.total', 1)
            ->where('recent.0.finished_at', '2026-09-27')
            ->where('recent.0.days', 18));
});

test('início sem sessão nem fila não quebra', function () {
    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('live_session', null)
            ->where('next_in_queue', null));
});

test('início sem dados não quebra', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('reading', 0)
            ->has('recent', 0)
            ->where('reading_now', null));
});

test('mini cartão da barra lateral mostra a leitura atual e a sequência', function () {
    $book = Book::factory()->onShelf(ReadingStatus::Reading)->create(['title' => 'Torto Arado', 'pages' => 100]);
    $reading = $book->currentReading;
    app(ReadingService::class)->registerSession($reading, 20, null, Carbon::today());
    sessionOn('2026-10-13', 1, 5, $reading);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('reading_now.title', 'Torto Arado')
            ->where('reading_now.percent', 20)
            ->where('reading_now.streak', 2)
            ->where('reading_now.week', [0, 0, 0, 0, 0, 1, 1]));
});

test('leitura com a sessão mais recente vem primeiro, à frente de um livro recém-começado', function () {
    $older = Book::factory()->onShelf(ReadingStatus::Reading)->create(['title' => 'Lido ontem']);
    $newer = Book::factory()->onShelf(ReadingStatus::Reading)->create(['title' => 'Lido hoje']);
    Book::factory()->onShelf(ReadingStatus::Reading)->create(['title' => 'Recém-começado']);
    sessionOn('2026-10-14', 1, 5, $newer->currentReading);
    sessionOn('2026-10-13', 1, 5, $older->currentReading);
    sessionOn('2026-10-14', 6, 9, $newer->currentReading);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('reading.0.title', 'Lido hoje')
            ->where('reading.1.title', 'Lido ontem')
            ->where('reading.2.title', 'Recém-começado')
            ->where('reading_now.title', 'Lido hoje'));
});

test('tela do registro rápido lista só leituras em andamento', function () {
    Book::factory()->onShelf(ReadingStatus::Reading)->create(['title' => 'Lendo agora']);
    Book::factory()->onShelf(ReadingStatus::WantToRead)->create(['title' => 'Na fila']);

    $this->get(route('quick-log'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('quick-log')
            ->has('readings', 1)
            ->where('readings.0.title', 'Lendo agora')
            ->where('streak', 0));
});

test('registro rápido salva a sessão e volta para a janela', function () {
    $book = Book::factory()->onShelf(ReadingStatus::Reading)->create(['pages' => 300]);

    $this->post(route('quick-log.store'), ['book_id' => $book->id, 'page_to' => 33, 'minutes' => 15])
        ->assertRedirect(route('quick-log'));

    expect($book->currentReading->refresh()->current_page)->toBe(33)
        ->and(ReadingSession::sole()->minutes)->toBe(15);

    $this->post(route('quick-log.store'), ['book_id' => 9999, 'page_to' => 40])->assertSessionHasErrors('book_id');
});

test('registro rápido cria a leitura quando o livro não tem uma', function () {
    $book = Book::factory()->create(['pages' => 100]);

    $this->post(route('quick-log.store'), ['book_id' => $book->id, 'page_to' => 10])->assertRedirect();

    expect($book->currentReading->status)->toBe(ReadingStatus::Reading)
        ->and($book->currentReading->current_page)->toBe(10);
});

test('o atalho global padrão é registrado com o evento do registro rápido', function () {
    GlobalShortcut::fake();

    QuickLog::registerShortcut(QuickLog::DEFAULT_SHORTCUT);

    GlobalShortcut::assertKey('CmdOrCtrl+Shift+L');
    GlobalShortcut::assertEvent(QuickLogShortcutPressed::class);
});

test('troca de atalho solta a combinação anterior', function () {
    $fake = GlobalShortcut::fake();

    QuickLog::replaceShortcut('CmdOrCtrl+Shift+L', 'CmdOrCtrl+Alt+L');

    expect($fake->unregisteredCount)->toBe(1)
        ->and($fake->registeredCount)->toBe(1);
    GlobalShortcut::assertKey('CmdOrCtrl+Alt+L');
});

test('o atalho pressionado abre a janela da barra de menu', function () {
    $this->mock(MenuBarManager::class, fn ($mock) => $mock->shouldReceive('show')->once());

    Event::dispatch(new QuickLogShortcutPressed('CmdOrCtrl+Shift+L'));
});

test('o listener do atalho está registrado para qualquer request', function () {
    expect(Event::hasListeners(QuickLogShortcutPressed::class))->toBeTrue();
});

test('o atalho guardado nas settings tem prioridade sobre o padrão', function () {
    Setting::put('quick_log_shortcut', 'CmdOrCtrl+Alt+K');

    expect(QuickLog::shortcut())->toBe('CmdOrCtrl+Alt+K');
});

test('o atalho cai para o padrão quando não há valor guardado', function () {
    expect(QuickLog::shortcut())->toBe(QuickLog::DEFAULT_SHORTCUT);
});
