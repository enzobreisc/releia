<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\ReadingSession;
use App\Services\ReadingTimer;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Carbon::setTestNow('2026-10-14 20:00:00');
});

/** Livro na estante "lendo", parado na página indicada. */
function timerBookAt(int $page, int $pages = 300): Book
{
    $book = Book::factory()->onShelf(ReadingStatus::Reading)->create(['pages' => $pages]);
    $book->currentReading->update(['current_page' => $page]);

    return $book->fresh();
}

test('timer conta o tempo, desconta as pausas e salva a sessão com os minutos', function () {
    $book = timerBookAt(32);

    $this->post(route('quick-log.timer.start'), ['book_id' => $book->id, 'start_page' => 32])
        ->assertRedirect(route('quick-log'));

    Carbon::setTestNow('2026-10-14 20:10:00');
    $this->post(route('quick-log.timer.pause'));
    Carbon::setTestNow('2026-10-14 20:30:00');
    $this->post(route('quick-log.timer.resume'));
    Carbon::setTestNow('2026-10-14 20:45:00');

    $this->get(route('quick-log'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('timer.book_id', $book->id)
            ->where('timer.start_page', 32)
            ->where('timer.elapsed', 25 * 60)
            ->where('timer.paused', false));

    $this->post(route('quick-log.timer.finish'), ['page_to' => 58])
        ->assertRedirect(route('quick-log'))
        ->assertSessionHas('quick_log_saved.pages', 26);

    $session = ReadingSession::sole();

    expect($session->page_from)->toBe(33)
        ->and($session->page_to)->toBe(58)
        ->and($session->minutes)->toBe(25)
        ->and($book->currentReading->refresh()->current_page)->toBe(58)
        ->and(app(ReadingTimer::class)->current())->toBeNull();
});

test('começar numa página adiante faz o livro avançar até ela ao salvar', function () {
    $book = timerBookAt(10);

    $this->post(route('quick-log.timer.start'), ['book_id' => $book->id, 'start_page' => 40]);
    Carbon::setTestNow('2026-10-14 20:00:20');
    $this->post(route('quick-log.timer.finish'), ['page_to' => 50]);

    $session = ReadingSession::sole();

    expect($session->page_from)->toBe(41)
        ->and($session->minutes)->toBe(1);
});

test('timer recusa página inicial antes da registrada e página final que não avança', function () {
    $book = timerBookAt(32, 96);

    $this->post(route('quick-log.timer.start'), ['book_id' => $book->id, 'start_page' => 20])
        ->assertSessionHasErrors('start_page');
    $this->post(route('quick-log.timer.start'), ['book_id' => $book->id, 'start_page' => 96])
        ->assertSessionHasErrors('start_page');

    $this->post(route('quick-log.timer.start'), ['book_id' => $book->id, 'start_page' => 40]);

    $this->post(route('quick-log.timer.finish'), ['page_to' => 40])->assertSessionHasErrors('page_to');
    $this->post(route('quick-log.timer.finish'), ['page_to' => 120])->assertSessionHasErrors('page_to');

    // Nada foi gravado: nem sessão nem o avanço até a página inicial.
    expect(ReadingSession::count())->toBe(0)
        ->and($book->currentReading->refresh()->current_page)->toBe(32)
        ->and(app(ReadingTimer::class)->current())->not->toBeNull();
});

test('descartar o timer não grava nada', function () {
    $book = timerBookAt(5);

    $this->post(route('quick-log.timer.start'), ['book_id' => $book->id, 'start_page' => 5]);
    $this->delete(route('quick-log.timer.discard'))->assertRedirect(route('quick-log'));

    expect(app(ReadingTimer::class)->current())->toBeNull()
        ->and(ReadingSession::count())->toBe(0);
});

test('a leitura do dia oferece livros de quero ler e começa um', function () {
    $want = Book::factory()->onShelf(ReadingStatus::WantToRead)->create(['title' => 'Próximo']);

    $this->get(route('quick-log'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('available.0.title', 'Próximo')
            ->has('week', 7)
            ->where('timer', null)
            ->where('saved', null));

    $this->post(route('quick-log.books'), ['book_id' => $want->id])->assertRedirect(route('quick-log'));

    expect($want->currentReading->refresh()->status)->toBe(ReadingStatus::Reading);
});
