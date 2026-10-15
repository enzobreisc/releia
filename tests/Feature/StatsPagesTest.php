<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Services\ProfileService;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Carbon::setTestNow('2026-10-14 12:00:00');
});

test('estatísticas mostram o ano pedido e os indicadores dele', function () {
    pagesSample2026();

    $this->get(route('stats.index', ['year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('stats')
            ->where('selected', '2026')
            ->where('indicators.books_read', 4)
            ->where('indicators.pages_read', 770)
            ->where('forecast.projection', 5)
            ->has('monthly', 12)
            ->has('calendar', 365));
});

test('estatísticas aceitam o histórico completo', function () {
    pagesSample2026();

    $this->get(route('stats.index', ['year' => 'all']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('selected', 'all')
            ->where('forecast', null)
            ->has('calendar', 365));
});

test('wrapped mostra o ano e o destaque de gênero e autor', function () {
    pagesSample2026();

    $this->get(route('wrapped.show', ['year' => 2026]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('wrapped')
            ->where('year', 2026)
            ->where('genre.label', 'Romance')
            ->where('author.label', 'Ana')
            ->where('fastest.title', 'Livro C')
            ->where('longest.title', 'Livro B')
            ->where('best_month.label', 'março')
            ->where('streak', 3)
            ->has('top', 4));
});

test('perfil mostra totais, calendário e atividade recente', function () {
    pagesSample2026();

    $this->get(route('profile.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('profile')
            ->where('since', '2025-12')
            ->where('totals.books_read', 5)
            ->where('totals.pages_read', 870)
            ->where('totals.streak', 2)
            ->has('calendar', 365)
            ->has('activity', 8));
});

test('fixar e desafixar livros no perfil', function () {
    $books = Book::factory()->count(3)->create();

    $this->post(route('profile.pins.store'), ['book_id' => $books[0]->id])->assertRedirect();
    $this->post(route('profile.pins.store'), ['book_id' => $books[1]->id])->assertRedirect();

    expect(app(ProfileService::class)->pinnedIds())->toBe([$books[0]->id, $books[1]->id]);

    $this->delete(route('profile.pins.destroy', $books[0]))->assertRedirect();

    expect(app(ProfileService::class)->pinnedIds())->toBe([$books[1]->id]);
});

test('o perfil limita os fixados e ignora livros excluídos', function () {
    $books = Book::factory()->count(ProfileService::MAX_PINS + 1)->create();

    foreach ($books as $book) {
        $this->post(route('profile.pins.store'), ['book_id' => $book->id]);
    }

    expect(app(ProfileService::class)->pinnedIds())->toHaveCount(ProfileService::MAX_PINS);

    // O último livro não entrou; excluir um fixado tira ele da lista.
    $pinned = app(ProfileService::class)->pinnedIds();
    Book::query()->whereKey($pinned[0])->delete();

    expect(app(ProfileService::class)->pinnedIds())->toHaveCount(ProfileService::MAX_PINS - 1);
});

test('a rota do perfil é a de perfil e não há mais a placeholder', function () {
    expect(route('profile.show'))->toEndWith('/profile')
        ->and(route('stats.index'))->toEndWith('/stats')
        ->and(route('wrapped.show'))->toEndWith('/wrapped');
});

test('livro abandonado não aparece como terminado na atividade', function () {
    pagesSample2026();

    $events = app(ProfileService::class)->recentActivity(50);

    // Livro E foi abandonado (tem finished_at, mas não está lido): só pode aparecer como sessão.
    $finishedTitles = collect($events)->where('type', 'finished')->pluck('title')->all();

    expect($finishedTitles)->not->toContain('Livro E')
        ->and(collect($events)->where('type', 'session')->pluck('title')->all())->toContain('Livro E');
});

/** Amostra mínima de 2026 para as telas (os números completos ficam em StatsServiceTest). */
function pagesSample2026(): void
{
    $a = Book::factory()->withAuthors(['Ana'])->create(['title' => 'Livro A', 'pages' => 200, 'genre' => 'Romance']);
    $b = Book::factory()->withAuthors(['Bruno'])->create(['title' => 'Livro B', 'pages' => 300, 'genre' => 'Ficção']);
    $c = Book::factory()->withAuthors(['Ana', 'Carla'])->create(['title' => 'Livro C', 'pages' => 150, 'genre' => 'Romance']);
    $d = Book::factory()->withAuthors(['Dário'])->create(['title' => 'Livro D', 'pages' => 400, 'genre' => 'Tecnologia']);
    $e = Book::factory()->withAuthors(['Elisa'])->create(['title' => 'Livro E', 'pages' => 250, 'genre' => 'História']);
    $f = Book::factory()->withAuthors(['Fábio'])->create(['title' => 'Livro F', 'pages' => 100, 'genre' => 'Romance']);

    $a1 = Reading::factory()->for($a)->create(['status' => ReadingStatus::Read, 'started_at' => '2026-01-10', 'finished_at' => '2026-01-14', 'rating' => 5]);
    $a2 = Reading::factory()->for($a)->create(['status' => ReadingStatus::Read, 'started_at' => '2026-06-01', 'finished_at' => '2026-06-02', 'rating' => 5]);
    $b1 = Reading::factory()->for($b)->create(['status' => ReadingStatus::Read, 'started_at' => '2026-03-01', 'finished_at' => '2026-03-31', 'rating' => 3]);
    $c1 = Reading::factory()->for($c)->create(['status' => ReadingStatus::Read, 'started_at' => '2026-03-30', 'finished_at' => '2026-03-30', 'rating' => 4]);
    $d1 = Reading::factory()->for($d)->create(['status' => ReadingStatus::Reading, 'started_at' => '2026-08-01']);
    $e1 = Reading::factory()->for($e)->create(['status' => ReadingStatus::Abandoned, 'started_at' => '2026-02-01', 'finished_at' => '2026-02-05']);
    Reading::factory()->for($f)->create(['status' => ReadingStatus::Read, 'started_at' => '2025-12-20', 'finished_at' => '2025-12-31', 'rating' => 2]);

    foreach ([
        [$a1, '2026-01-10', 1, 50], [$a1, '2026-01-11', 51, 100], [$a1, '2026-01-12', 101, 150], [$a1, '2026-01-14', 151, 200],
        [$a2, '2026-06-01', 1, 40], [$c1, '2026-03-30', 1, 150],
        [$d1, '2026-08-01', 1, 30], [$d1, '2026-10-13', 31, 50], [$d1, '2026-10-14', 51, 70],
        [$e1, '2026-02-01', 1, 10],
    ] as [$reading, $day, $from, $to]) {
        $reading->sessions()->create(['read_on' => $day, 'page_from' => $from, 'page_to' => $to]);
    }
}
