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

function liveSessionBook(int $currentPage, int $pages = 96): Book
{
    $book = Book::factory()->onShelf(ReadingStatus::Reading)->create(['pages' => $pages]);
    $book->currentReading->update(['current_page' => $currentPage]);

    return $book->fresh();
}

function startLiveSession(Book $book): void
{
    test()->post(route('live-session.start', $book))->assertRedirect(route('live-session.show'));
}

test('the screen redirects home when no session is running', function () {
    $this->get(route('live-session.show'))->assertRedirect(route('home'));
});

test('starting a session begins the timer at the page the reader stopped on', function () {
    $book = liveSessionBook(64);

    startLiveSession($book);

    $this->get(route('live-session.show'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('live-session')
            ->where('reading.book_id', $book->id)
            ->where('timer.start_page', 64)
            ->where('timer.page', 64)
            ->where('timer.paused', false));
});

test('starting again on the same book keeps the running timer', function () {
    $book = liveSessionBook(64);
    startLiveSession($book);

    Carbon::setTestNow('2026-10-14 20:10:00');
    startLiveSession($book);

    expect(app(ReadingTimer::class)->elapsedSeconds(app(ReadingTimer::class)->current()))->toBe(600);
});

test('starting on another book leaves the running session untouched', function () {
    $reading = liveSessionBook(64);
    $other = liveSessionBook(10);
    startLiveSession($reading);

    $this->post(route('live-session.start', $other))->assertRedirect();

    expect(app(ReadingTimer::class)->current()['book_id'])->toBe($reading->id);
});

test('the live page stays between the starting page and the last page of the book', function () {
    $book = liveSessionBook(64);
    startLiveSession($book);

    $this->patch(route('live-session.page'), ['page' => 70])->assertRedirect();
    expect(app(ReadingTimer::class)->current()['page'])->toBe(70);

    $this->patch(route('live-session.page'), ['page' => 12]);
    expect(app(ReadingTimer::class)->current()['page'])->toBe(64);

    $this->patch(route('live-session.page'), ['page' => 500]);
    expect(app(ReadingTimer::class)->current()['page'])->toBe(96);
});

test('pausing and resuming go through the screen routes', function () {
    startLiveSession(liveSessionBook(64));

    $this->post(route('live-session.pause'));
    expect(app(ReadingTimer::class)->current()['paused_at'])->not->toBeNull();

    $this->post(route('live-session.resume'));
    expect(app(ReadingTimer::class)->current()['paused_at'])->toBeNull();
});

test('finishing saves the session up to the live page and goes back to the book', function () {
    $book = liveSessionBook(64);
    startLiveSession($book);
    $this->patch(route('live-session.page'), ['page' => 76]);

    Carbon::setTestNow('2026-10-14 20:24:00');
    $this->post(route('live-session.finish'))->assertRedirect(route('books.show', $book));

    $session = ReadingSession::sole();

    expect($session->page_from)->toBe(65)
        ->and($session->page_to)->toBe(76)
        ->and($session->minutes)->toBe(24)
        ->and($book->currentReading->refresh()->current_page)->toBe(76)
        ->and(app(ReadingTimer::class)->current())->toBeNull();
});

test('finishing without moving forward is refused and the timer keeps running', function () {
    startLiveSession(liveSessionBook(64));

    $this->post(route('live-session.finish'))->assertSessionHasErrors('page_to');

    expect(ReadingSession::count())->toBe(0)
        ->and(app(ReadingTimer::class)->current())->not->toBeNull();
});

test('discarding drops the timer without saving and goes back to the book', function () {
    $book = liveSessionBook(64);
    startLiveSession($book);
    $this->patch(route('live-session.page'), ['page' => 76]);

    $this->delete(route('live-session.discard'))->assertRedirect(route('books.show', $book));

    expect(ReadingSession::count())->toBe(0)
        ->and(app(ReadingTimer::class)->current())->toBeNull()
        ->and($book->currentReading->refresh()->current_page)->toBe(64);
});

test('starting on another book offers to open the running session', function () {
    startLiveSession(liveSessionBook(64));

    $this->post(route('live-session.start', liveSessionBook(10)))
        ->assertSessionHas('toast.action.url', route('live-session.show', absolute: false));
});

test('the screen reports pace per hour, today and the daily average', function () {
    $book = liveSessionBook(64);
    $reading = $book->currentReading;
    $reading->sessions()->create(['read_on' => '2026-10-13', 'page_from' => 1, 'page_to' => 30, 'minutes' => 60]);
    $reading->sessions()->create(['read_on' => '2026-10-14', 'page_from' => 31, 'page_to' => 64, 'minutes' => 60]);

    startLiveSession($book);

    $this->get(route('live-session.show'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('pages_per_hour', 32)
            ->where('today.pages', 34)
            ->where('today.average', 32));
});

test('the pace per hour is missing while no session has minutes', function () {
    $book = liveSessionBook(64);
    $book->currentReading->sessions()->create(['read_on' => '2026-10-13', 'page_from' => 1, 'page_to' => 64, 'minutes' => null]);

    startLiveSession($book);

    $this->get(route('live-session.show'))
        ->assertInertia(fn (Assert $page) => $page->where('pages_per_hour', null));
});

test('every page knows whether a session is running', function () {
    $book = liveSessionBook(64);

    $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('has_live_session', false));

    startLiveSession($book);

    $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('has_live_session', true));
});
