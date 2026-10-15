<?php

use App\Enums\ReadingStatus;
use App\Enums\StoreType;
use App\Models\Book;
use App\Models\QueueItem;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Models\ShoppingItem;
use App\Services\QueueService;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    Carbon::setTestNow('2026-10-14 22:30:00');
});

/** Livro na estante "quero ler", como o cadastro faz. */
function wantToRead(array $attributes = []): Book
{
    $book = Book::factory()->create($attributes);
    Reading::factory()->for($book)->create(['status' => ReadingStatus::WantToRead]);

    return $book;
}

/** Fakes das fontes externas para a compra de um livro com ISBN. */
function fakeMetadataSources(): void
{
    Http::fake([
        'openlibrary.org/api/books*' => apiFixture('open-library/books-9786580309313.json'),
        'openlibrary.org/search.json*' => apiFixture('open-library/search-isbn-9786580309313.json'),
        'www.googleapis.com/*' => Http::response([], 429),
        'covers.openlibrary.org/*' => Http::response(str_repeat('x', 4096), 200, ['Content-Type' => 'image/jpeg']),
    ]);
}

test('adiciona ao fim da fila e ignora livro já na fila', function () {
    $first = wantToRead();
    $second = wantToRead();

    $this->post(route('queue.store'), ['book_id' => $first->id])->assertRedirect();
    $this->post(route('queue.store'), ['book_id' => $second->id])->assertRedirect();
    $this->post(route('queue.store'), ['book_id' => $first->id])->assertRedirect();

    expect(QueueItem::query()->orderBy('position')->pluck('book_id')->all())
        ->toBe([$first->id, $second->id])
        ->and(QueueItem::query()->orderBy('position')->pluck('position')->all())->toBe([1, 2]);
});

test('reordena a fila pelos ids e recusa uma lista que não bate com a fila', function () {
    $items = collect([wantToRead(), wantToRead(), wantToRead()])
        ->map(fn (Book $book) => app(QueueService::class)->add($book));

    $reversed = $items->pluck('id')->reverse()->values()->all();

    $this->patch(route('queue.reorder'), ['ids' => $reversed])->assertRedirect();

    expect(QueueItem::query()->orderBy('position')->pluck('id')->all())->toBe($reversed);

    $this->patch(route('queue.reorder'), ['ids' => [$reversed[0], $reversed[1]]])
        ->assertSessionHasErrors('ids');

    expect(QueueItem::query()->orderBy('position')->pluck('id')->all())->toBe($reversed);
});

test('remover um item renumera a fila sem buracos', function () {
    $items = collect([wantToRead(), wantToRead(), wantToRead()])
        ->map(fn (Book $book) => app(QueueService::class)->add($book));

    $this->delete(route('queue.destroy', $items[0]))->assertRedirect();

    expect(QueueItem::query()->orderBy('position')->pluck('position')->all())->toBe([1, 2]);
});

test('o ritmo usa a média dos dias lidos nos últimos 30 dias, ou o padrão sem sessões', function () {
    $queue = app(QueueService::class);

    expect($queue->pace(Carbon::today()))->toBe(['pages_per_day' => 20.0, 'from_sessions' => false]);

    $reading = Reading::factory()->for(wantToRead())->create();
    ReadingSession::factory()->for($reading)->create(['read_on' => '2026-10-10', 'page_from' => 1, 'page_to' => 30]);
    ReadingSession::factory()->for($reading)->create(['read_on' => '2026-10-10', 'page_from' => 31, 'page_to' => 40]);
    ReadingSession::factory()->for($reading)->create(['read_on' => '2026-10-12', 'page_from' => 41, 'page_to' => 50]);
    // Fora da janela de 30 dias: não entra no ritmo.
    ReadingSession::factory()->for($reading)->create(['read_on' => '2026-08-01', 'page_from' => 1, 'page_to' => 500]);

    // Dois dias lidos: 40 páginas no dia 10 e 10 no dia 12, média 25.
    expect($queue->pace(Carbon::today()))->toBe(['pages_per_day' => 25.0, 'from_sessions' => true]);
});

test('estima dias pelo que falta do livro, arredondando para cima', function () {
    $queue = app(QueueService::class);
    $book = Book::factory()->create(['pages' => 301]);

    expect($queue->estimateDays($book, 20.0))->toBe(16)
        ->and($queue->estimateDays(Book::factory()->create(['pages' => null]), 20.0))->toBeNull();

    Reading::factory()->for($book)->create(['status' => ReadingStatus::Reading, 'current_page' => 281]);

    expect($queue->estimateDays($book->fresh(), 20.0))->toBe(1);
});

test('lista de compras grava o preço em centavos a partir do que foi digitado', function () {
    $this->post(route('shopping.store'), [
        'title' => 'Memórias',
        'store_type' => 'used_bookstore',
        'estimated_price' => '34,90',
    ])->assertRedirect();

    $this->post(route('shopping.store'), [
        'title' => 'Sem preço',
        'store_type' => 'online',
        'estimated_price' => '',
    ])->assertRedirect();

    expect(ShoppingItem::query()->orderBy('id')->pluck('estimated_price_cents')->all())->toBe([3490, null]);
});

test('recusa preço e ISBN inválidos na compra', function () {
    $this->post(route('shopping.store'), [
        'title' => 'X',
        'store_type' => 'bookstore',
        'estimated_price' => '12,345',
    ])->assertSessionHasErrors('estimated_price');

    $this->post(route('shopping.store'), [
        'title' => 'X',
        'store_type' => 'bookstore',
        'isbn' => '123',
    ])->assertSessionHasErrors('isbn');

    expect(ShoppingItem::count())->toBe(0);
});

test('comprar um item sem ISBN cria o livro na estante quero ler e põe na fila', function () {
    $this->post(route('shopping.store'), [
        'title' => 'Memórias de um sebo',
        'author' => 'Fulana',
        'store_type' => 'used_bookstore',
        'estimated_price' => '20,00',
    ]);

    $item = ShoppingItem::sole();

    $this->post(route('shopping.buy', $item), ['queue' => true])->assertRedirect();

    $book = Book::with('authors', 'currentReading')->sole();
    $item->refresh();

    expect($book->title)->toBe('Memórias de um sebo')
        ->and($book->authors->pluck('name')->all())->toBe(['Fulana'])
        ->and($book->currentReading?->status)->toBe(ReadingStatus::WantToRead)
        ->and($item->book_id)->toBe($book->id)
        ->and($item->bought_at)->not->toBeNull()
        ->and(QueueItem::query()->where('book_id', $book->id)->exists())->toBeTrue();

    // Comprar de novo não duplica nada.
    $this->post(route('shopping.buy', $item), ['queue' => true]);

    expect(Book::count())->toBe(1)
        ->and(QueueItem::count())->toBe(1);
});

test('comprar sem pôr na fila deixa o livro só na biblioteca', function () {
    $this->post(route('shopping.store'), ['title' => 'Só biblioteca', 'store_type' => 'online']);

    $this->post(route('shopping.buy', ShoppingItem::sole()), ['queue' => false]);

    expect(Book::count())->toBe(1)
        ->and(QueueItem::count())->toBe(0);
});

test('comprar com ISBN usa os metadados da fonte', function () {
    fakeMetadataSources();

    $this->post(route('shopping.store'), [
        'title' => 'Torto Arado (anotado)',
        'store_type' => 'bookstore',
        'isbn' => '978-65-80309-31-3',
    ]);

    $this->post(route('shopping.buy', ShoppingItem::sole()), ['queue' => false]);

    $book = Book::sole();

    expect($book->title)->toBe('Torto Arado')
        ->and($book->isbn_13)->toBe('9786580309313')
        ->and($book->source->value)->toBe('open_library');
});

test('comprar um ISBN que já está na biblioteca reaproveita o livro', function () {
    Http::preventStrayRequests();
    $existing = Book::factory()->create(['isbn_13' => '9786580309313']);

    $this->post(route('shopping.store'), [
        'title' => 'Torto Arado',
        'store_type' => 'bookstore',
        'isbn' => '9786580309313',
    ]);

    $this->post(route('shopping.buy', ShoppingItem::sole()), ['queue' => false]);

    expect(Book::count())->toBe(1)
        ->and(ShoppingItem::sole()->book_id)->toBe($existing->id);
});

test('a tela de fila traz itens, estimativas e total só dos pendentes', function () {
    $book = wantToRead(['pages' => 200]);
    app(QueueService::class)->add($book);

    $this->post(route('shopping.store'), ['title' => 'Pendente', 'store_type' => 'bookstore', 'estimated_price' => '10']);
    $this->post(route('shopping.store'), ['title' => 'Outro', 'store_type' => 'online', 'estimated_price' => '5,50']);
    $this->post(route('shopping.buy', ShoppingItem::query()->where('title', 'Outro')->sole()), ['queue' => false]);

    $this->get(route('queue.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('queue')
            ->has('queue', 1)
            ->where('queue.0.estimated_days', 10)
            ->where('pace.pages_per_day', 20)
            ->has('shopping', 2)
            ->where('totals.pending_count', 1)
            ->where('totals.pending_cents', 1000)
            ->where('shopping.1.bought', true));

    $this->get(route('queue.index', ['store' => 'online']))
        ->assertInertia(fn (Assert $page) => $page->has('shopping', 1)->where('filters.store', 'online'));
});

test('a fila não oferece livro que já está nela nem livro que não é quero ler', function () {
    $queued = wantToRead();
    app(QueueService::class)->add($queued);
    wantToRead();
    Book::factory()->create();

    $this->get(route('queue.index'))
        ->assertInertia(fn (Assert $page) => $page->has('available', 1));
});

test('money parsing aceita formatos brasileiros e recusa o que não é valor', function () {
    expect(Money::parseReais('34,90'))->toBe(3490)
        ->and(Money::parseReais('1.234,56'))->toBe(123456)
        ->and(Money::parseReais('10'))->toBe(1000)
        ->and(Money::parseReais('R$ 5,5'))->toBe(550)
        ->and(Money::parseReais('34.90'))->toBe(3490)
        ->and(Money::parseReais(''))->toBeNull()
        ->and(Money::parseReais('1,234'))->toBeNull()
        ->and(Money::parseReais('abc'))->toBeNull()
        ->and(StoreType::Online->label())->toBe('Online');
});
