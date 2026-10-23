<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Carbon::setTestNow('2026-10-21 12:00:00');
});

test('a linha do tempo agrupa as leituras por ano, do mais recente ao mais antigo', function () {
    $old = Book::factory()->create(['title' => 'Livro Antigo']);
    $new = Book::factory()->create(['title' => 'Livro Novo']);
    Reading::factory()->for($old)->create(['status' => ReadingStatus::Read, 'started_at' => '2024-03-04', 'finished_at' => '2024-03-12']);
    Reading::factory()->for($new)->create(['status' => ReadingStatus::Read, 'started_at' => '2026-01-05', 'finished_at' => '2026-02-14']);

    $this->get(route('timeline.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('timeline')
            ->where('today', '2026-10-21')
            ->has('years', 2)
            ->where('years.0.year', 2026)
            ->where('years.0.readings.0.title', 'Livro Novo')
            ->where('years.0.readings.0.book_id', $new->id)
            ->where('years.0.readings.0.started_at', '2026-01-05')
            ->where('years.0.readings.0.finished_at', '2026-02-14')
            ->where('years.1.year', 2024)
            ->where('years.1.readings.0.title', 'Livro Antigo'));
});

test('uma leitura que atravessa a virada de ano aparece nos dois anos', function () {
    Reading::factory()->for(Book::factory()->create())->create(['status' => ReadingStatus::Read, 'started_at' => '2024-12-26', 'finished_at' => '2025-04-10']);

    $this->get(route('timeline.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('years', 2)
            ->where('years.0.year', 2025)
            ->has('years.0.readings', 1)
            ->where('years.1.year', 2024)
            ->has('years.1.readings', 1));
});

test('a segunda leitura do mesmo livro é marcada como releitura', function () {
    $book = Book::factory()->create();
    Reading::factory()->for($book)->create(['status' => ReadingStatus::Read, 'started_at' => '2025-01-02', 'finished_at' => '2025-01-06']);
    Reading::factory()->for($book)->create(['status' => ReadingStatus::Read, 'started_at' => '2025-05-25', 'finished_at' => '2025-06-30']);

    $this->get(route('timeline.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('years.0.readings.0.is_reread', false)
            ->where('years.0.readings.1.is_reread', true));
});

test('uma leitura em andamento chega até hoje, passando por todos os anos', function () {
    Reading::factory()->for(Book::factory()->create())->create(['status' => ReadingStatus::Reading, 'started_at' => '2025-11-01']);

    $this->get(route('timeline.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('years', 2)
            ->where('years.0.year', 2026)
            ->where('years.0.readings.0.status', 'reading')
            ->where('years.0.readings.0.finished_at', null)
            ->where('years.1.year', 2025));
});

test('leituras abandonadas aparecem com o status abandonado', function () {
    Reading::factory()->for(Book::factory()->create())->create(['status' => ReadingStatus::Abandoned, 'started_at' => '2026-06-01', 'finished_at' => '2026-07-20']);

    $this->get(route('timeline.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('years.0.readings.0.status', 'abandoned')
            ->where('years.0.readings.0.finished_at', '2026-07-20'));
});

test('leituras sem data de início e livros só desejados ficam fora', function () {
    Reading::factory()->for(Book::factory()->create())->create(['status' => ReadingStatus::WantToRead]);

    $this->get(route('timeline.index'))
        ->assertInertia(fn (Assert $page) => $page->has('years', 0));
});

test('a linha do tempo não faz uma consulta por leitura', function () {
    Reading::factory()->count(5)->for(Book::factory()->create())->create(['status' => ReadingStatus::Read, 'started_at' => '2026-01-01', 'finished_at' => '2026-01-02']);

    DB::enableQueryLog();
    $this->get(route('timeline.index'))->assertOk();
    $queries = collect(DB::getQueryLog())->filter(fn (array $query) => str_contains($query['query'], 'from "books" where "books"."id" in'));

    expect($queries)->toHaveCount(1);
});
