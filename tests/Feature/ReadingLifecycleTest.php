<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Note;
use App\Models\QueueItem;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Models\Setting;
use App\Models\ShoppingItem;
use App\Services\QueueService;
use App\Services\ReadingService;
use App\Services\UndoService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('local');
    Carbon::setTestNow('2026-10-15 20:00:00');
});

/** Livro de 100 páginas com uma leitura no estado pedido. */
function lifecycleBook(ReadingStatus $status, array $reading = []): Book
{
    $book = Book::factory()->create(['pages' => 100]);
    Reading::factory()->for($book)->create(['status' => $status, ...$reading]);

    return $book->refresh();
}

/** Livro lido de 1 a 9 out, com nota 4 e uma sessão em 2 out. */
function finishedBook(): Book
{
    $book = lifecycleBook(ReadingStatus::Read, [
        'started_at' => '2026-10-01',
        'finished_at' => '2026-10-09',
        'current_page' => 100,
        'rating' => 4,
    ]);
    $book->currentReading->sessions()->create([
        'read_on' => '2026-10-02',
        'page_from' => 1,
        'page_to' => 100,
    ]);

    return $book;
}

function lastToast(): array
{
    return session('toast');
}

test('voltar de lendo para quero ler guarda início, página e sessões', function () {
    $book = lifecycleBook(ReadingStatus::Reading, ['started_at' => '2026-10-10', 'current_page' => 32]);

    $this->patch(route('books.reading', $book), ['status' => 'want_to_read'])->assertRedirect();

    $reading = $book->currentReading->refresh();
    expect($reading->status)->toBe(ReadingStatus::WantToRead)
        ->and($reading->started_at?->toDateString())->toBe('2026-10-10')
        ->and($reading->current_page)->toBe(32)
        ->and(lastToast()['title'])->toBe('Movido para Quero ler')
        ->and(lastToast()['action']['label'])->toBe('Pôr na fila');
});

test('livro lido para quero ler cria uma releitura na fila e não apaga a leitura terminada (D2)', function () {
    $book = finishedBook();
    $first = $book->currentReading;

    $this->patch(route('books.reading', $book), ['status' => 'want_to_read'])->assertRedirect();

    $first->refresh();
    $book->refresh();

    expect($book->readings()->count())->toBe(2)
        ->and($first->status)->toBe(ReadingStatus::Read)
        ->and($first->finished_at?->toDateString())->toBe('2026-10-09')
        ->and($book->currentReading->status)->toBe(ReadingStatus::WantToRead)
        ->and(QueueItem::query()->where('book_id', $book->id)->exists())->toBeTrue()
        ->and(lastToast()['title'])->toBe('Quero reler');
});

test('ler de novo começa uma 2ª leitura hoje', function () {
    $book = finishedBook();

    $this->post(route('books.reread', $book), ['status' => 'reading'])->assertRedirect();

    $current = $book->refresh()->currentReading;
    expect($current->status)->toBe(ReadingStatus::Reading)
        ->and($current->started_at?->toDateString())->toBe('2026-10-15')
        ->and($current->current_page)->toBe(0)
        ->and(lastToast()['title'])->toBe('2ª leitura começou');
});

test('só dá para reler um livro terminado', function () {
    $book = lifecycleBook(ReadingStatus::Reading);

    $this->post(route('books.reread', $book), ['status' => 'reading'])->assertSessionHasErrors('status');
});

test('terminar grava data, nota e a linha no começo da resenha, e oferece o próximo da fila', function () {
    $book = lifecycleBook(ReadingStatus::Reading, ['started_at' => '2026-10-10', 'current_page' => 60, 'review' => 'Texto antigo']);
    $next = lifecycleBook(ReadingStatus::WantToRead);
    app(QueueService::class)->add($book);
    app(QueueService::class)->add($next);

    $this->post(route('readings.finish', $book->currentReading), [
        'finished_on' => '2026-10-14',
        'rating' => 5,
        'line' => 'Curto e brutal.',
    ])->assertRedirect();

    $reading = $book->currentReading->refresh();
    expect($reading->status)->toBe(ReadingStatus::Read)
        ->and($reading->finished_at?->toDateString())->toBe('2026-10-14')
        ->and($reading->current_page)->toBe(100)
        ->and($reading->rating)->toBe(5)
        ->and($reading->review)->toBe("Curto e brutal.\n\nTexto antigo")
        ->and(QueueItem::query()->where('book_id', $book->id)->exists())->toBeFalse()
        ->and(lastToast()['action']['label'])->toBe("Começar {$next->title}")
        ->and(lastToast()['undo'])->not->toBeNull();
});

test('terminar recusa data no futuro e antes da última sessão', function (string $date, string $message) {
    $book = lifecycleBook(ReadingStatus::Reading, ['started_at' => '2026-10-10', 'current_page' => 20]);
    $book->currentReading->sessions()->create(['read_on' => '2026-10-13', 'page_from' => 1, 'page_to' => 20]);

    $this->post(route('readings.finish', $book->currentReading), ['finished_on' => $date])
        ->assertSessionHasErrors(['finished_on' => $message]);
})->with([
    'futuro' => ['2026-10-20', 'O término não pode ser depois de hoje.'],
    'antes da sessão' => ['2026-10-12', 'A última sessão foi em 13 out. Escolha essa data ou depois.'],
]);

test('abandonar guarda o motivo; retomar volta à mesma leitura sem o motivo', function () {
    $book = lifecycleBook(ReadingStatus::Reading, ['started_at' => '2026-10-10', 'current_page' => 32]);
    $reading = $book->currentReading;

    $this->post(route('readings.abandon', $reading), ['reason' => 'sem tempo agora'])->assertRedirect();
    expect($reading->refresh()->status)->toBe(ReadingStatus::Abandoned)
        ->and($reading->abandon_reason)->toBe('sem tempo agora')
        ->and(lastToast()['title'])->toBe('Abandonado na p. 32');

    $this->patch(route('books.reading', $book), ['status' => 'reading'])->assertRedirect();
    expect($reading->refresh()->status)->toBe(ReadingStatus::Reading)
        ->and($reading->abandon_reason)->toBeNull()
        ->and($reading->finished_at)->toBeNull()
        ->and($book->readings()->count())->toBe(1)
        ->and(lastToast()['title'])->toBe('Leitura retomada');
});

test('livro lido não pode ser abandonado', function () {
    $book = finishedBook();

    $this->post(route('readings.abandon', $book->currentReading))->assertSessionHasErrors('status');
});

test('corrigir desmarca como lido e apaga só a data de término', function () {
    $book = finishedBook();
    $reading = $book->currentReading;

    $this->post(route('readings.reopen', $reading))->assertRedirect();

    expect($reading->refresh()->status)->toBe(ReadingStatus::Reading)
        ->and($reading->finished_at)->toBeNull()
        ->and($reading->started_at?->toDateString())->toBe('2026-10-01')
        ->and($reading->rating)->toBe(4)
        ->and($book->readings()->count())->toBe(1);
});

test('editar datas valida o término e salva', function () {
    $book = finishedBook();
    $reading = $book->currentReading;

    $this->patch(route('readings.dates', $reading), ['started_at' => '2026-10-01', 'finished_at' => '2026-09-30'])
        ->assertSessionHasErrors(['finished_at' => 'O término não pode ser antes do início.']);
    $this->patch(route('readings.dates', $reading), ['started_at' => '2026-10-01', 'finished_at' => '2026-10-01'])
        ->assertSessionHasErrors(['finished_at' => 'A última sessão foi em 2 out. Escolha essa data ou depois.']);

    $this->patch(route('readings.dates', $reading), ['started_at' => '2026-09-29', 'finished_at' => '2026-10-05'])
        ->assertRedirect();

    expect($reading->refresh()->started_at?->toDateString())->toBe('2026-09-29')
        ->and($reading->finished_at?->toDateString())->toBe('2026-10-05')
        ->and(lastToast()['sub'])->toBe('estatísticas de out 2026 atualizadas');
});

test('a única leitura do livro não pode ser apagada; uma releitura pode', function () {
    $book = finishedBook();
    $first = $book->currentReading;

    $this->delete(route('readings.destroy', $first))->assertSessionHasErrors('reading');

    $second = app(ReadingService::class)->startReread($book, ReadingStatus::Reading);
    $this->delete(route('readings.destroy', $second))->assertRedirect();

    expect($book->readings()->count())->toBe(1);
});

test('desfazer devolve a leitura e a fila como estavam antes de terminar', function () {
    $book = lifecycleBook(ReadingStatus::Reading, ['started_at' => '2026-10-10', 'current_page' => 60]);
    app(QueueService::class)->add($book);

    $this->post(route('readings.finish', $book->currentReading), ['finished_on' => '2026-10-15']);
    $token = lastToast()['undo'];

    $this->post(route('undo', $token))->assertRedirect();

    $reading = $book->currentReading->refresh();
    expect($reading->status)->toBe(ReadingStatus::Reading)
        ->and($reading->finished_at)->toBeNull()
        ->and($reading->current_page)->toBe(60)
        ->and(QueueItem::query()->where('book_id', $book->id)->exists())->toBeTrue()
        ->and(lastToast()['title'])->toBe('Desfeito');
});

test('desfazer uma releitura apaga a leitura nova', function () {
    $book = finishedBook();

    $this->post(route('books.reread', $book), ['status' => 'reading']);
    $this->post(route('undo', lastToast()['undo']));

    expect($book->readings()->count())->toBe(1)
        ->and($book->refresh()->currentReading->status)->toBe(ReadingStatus::Read);
});

test('tirar da fila e desfazer devolve o livro à mesma posição', function () {
    $books = collect(range(1, 3))->map(fn () => lifecycleBook(ReadingStatus::WantToRead));
    $books->each(fn (Book $book) => app(QueueService::class)->add($book));
    $middle = QueueItem::query()->where('book_id', $books[1]->id)->sole();

    $this->delete(route('queue.destroy', $middle));
    expect(lastToast()['sub'])->toBe($books[1]->title.' · era o 2º');

    $this->post(route('undo', lastToast()['undo']));

    expect(QueueItem::query()->orderBy('position')->pluck('book_id')->all())->toBe($books->pluck('id')->all());
});

test('apagar sessão e desfazer devolve a sessão e a página', function () {
    $book = lifecycleBook(ReadingStatus::Reading, ['current_page' => 0]);
    $session = app(ReadingService::class)->registerSession($book->currentReading, 40, 30, Carbon::today());

    $this->delete(route('sessions.destroy', $session));
    expect(ReadingSession::query()->count())->toBe(0);

    $this->post(route('undo', lastToast()['undo']));

    expect(ReadingSession::query()->sole()->page_to)->toBe(40)
        ->and($book->currentReading->refresh()->current_page)->toBe(40);
});

test('excluir nota e desfazer devolve o texto e as tags', function () {
    $book = Book::factory()->create();
    $this->post(route('notes.store'), ['book_id' => $book->id, 'kind' => 'excerpt', 'page' => '12', 'body_md' => 'Trecho #kafka']);
    $note = Note::query()->sole();

    $this->delete(route('notes.destroy', $note));
    $this->post(route('undo', lastToast()['undo']));

    $restored = Note::query()->with('tags')->sole();
    expect($restored->id)->toBe($note->id)
        ->and($restored->tags->pluck('name')->all())->toBe(['kafka']);
});

test('token vencido não desfaz', function () {
    $book = lifecycleBook(ReadingStatus::WantToRead);
    app(QueueService::class)->add($book);

    $this->delete(route('queue.destroy', QueueItem::query()->sole()));
    $token = lastToast()['undo'];

    Carbon::setTestNow(Carbon::now()->addSeconds(UndoService::TTL_SECONDS + 1));
    $this->post(route('undo', $token));

    expect(QueueItem::query()->count())->toBe(0)
        ->and(lastToast()['kind'])->toBe('error');
});

test('editar os dados do livro salva e o desfazer volta título e autores', function () {
    $book = Book::factory()->withAuthors(['Franz Kafka'])->create(['title' => 'A Metamorfose', 'pages' => 96]);
    Reading::factory()->for($book)->create();

    $this->patch(route('books.update', $book), [
        'title' => 'A metamorfose',
        'authors' => ['Franz Kafka', 'Modesto Carone'],
        'pages' => 104,
        'published_year' => 2019,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($book->refresh()->title)->toBe('A metamorfose')
        ->and($book->pages)->toBe(104)
        ->and($book->authors->pluck('name')->all())->toBe(['Franz Kafka', 'Modesto Carone']);

    $this->post(route('undo', lastToast()['undo']));

    $book->refresh();
    expect($book->title)->toBe('A Metamorfose')
        ->and($book->pages)->toBe(96)
        ->and($book->authors->pluck('name')->all())->toBe(['Franz Kafka']);
});

test('o total de páginas não fica abaixo de uma sessão registrada (D7)', function () {
    $book = lifecycleBook(ReadingStatus::Reading);
    app(ReadingService::class)->registerSession($book->currentReading, 90, null, Carbon::parse('2026-10-14'));

    $this->patch(route('books.update', $book), ['title' => $book->title, 'pages' => 80])
        ->assertSessionHasErrors(['pages', 'pages_session']);

    expect(session('errors')->first('pages'))->toContain('não pode ter menos que 90 páginas')
        ->and($book->refresh()->pages)->toBe(100);
});

test('o ISBN não pode ser de outro livro', function () {
    $other = Book::factory()->create(['isbn_13' => '9788571646858', 'title' => 'Outro']);
    $book = Book::factory()->create();

    $this->patch(route('books.update', $book), ['title' => $book->title, 'isbn_13' => '978-85-7164-685-8'])
        ->assertSessionHasErrors(['isbn_13', 'isbn_13_book' => (string) $other->id]);
});

test('o detalhe traz o histórico de leituras, a posição na fila e o que vai junto ao remover', function () {
    $book = finishedBook();
    app(ReadingService::class)->startReread($book, ReadingStatus::WantToRead);

    $this->get(route('books.show', $book))
        ->assertInertia(fn (Assert $page) => $page
            ->component('book')
            ->has('readings', 2)
            ->where('readings.0.number', 1)
            ->where('readings.0.days', 9)
            ->where('readings.0.sessions_count', 1)
            ->where('readings.1.status', 'want_to_read')
            ->where('queue_position', 1)
            ->where('removal.readings', 2)
            ->where('removal.sessions', 1)
            ->where('max_logged_page', 100));
});

test('a biblioteca mostra a posição na fila e o número de leituras', function () {
    $book = finishedBook();
    app(ReadingService::class)->startReread($book, ReadingStatus::WantToRead);

    $this->get(route('library.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('books.0.queue_position', 1)
            ->where('books.0.readings_count', 2));
});

test('desmarcar comprado tira da fila o que entrou pela compra', function () {
    $book = lifecycleBook(ReadingStatus::WantToRead);
    $item = ShoppingItem::factory()->create(['book_id' => $book->id, 'title' => $book->title]);

    $this->post(route('shopping.buy', $item))->assertRedirect();
    expect(QueueItem::query()->where('book_id', $book->id)->exists())->toBeTrue();

    $this->post(route('shopping.unbuy', $item))->assertRedirect();

    expect($item->refresh()->bought_at)->toBeNull()
        ->and($item->book_id)->toBe($book->id)
        ->and(QueueItem::query()->where('book_id', $book->id)->exists())->toBeFalse()
        ->and(lastToast()['sub'])->toBe($book->title.' · saiu da fila');
});

test('a preferência "ao comprar" fica salva e vale para a próxima compra', function () {
    $book = lifecycleBook(ReadingStatus::WantToRead);
    $item = ShoppingItem::factory()->create(['book_id' => $book->id]);

    $this->put(route('shopping.preference'), ['queue_on_buy' => false])->assertRedirect();
    $this->post(route('shopping.buy', $item));

    expect(Setting::get('shopping_queue_on_buy'))->toBeFalse()
        ->and(QueueItem::query()->count())->toBe(0);
});

test('salvar a última página na barra de menu termina o livro', function () {
    $book = lifecycleBook(ReadingStatus::Reading, ['started_at' => '2026-10-10', 'current_page' => 80]);
    $next = lifecycleBook(ReadingStatus::WantToRead);
    app(QueueService::class)->add($next);

    $this->post(route('quick-log.store'), ['book_id' => $book->id, 'page_to' => 100, 'minutes' => 30])
        ->assertRedirect(route('quick-log'));

    $saved = session('quick_log_saved');
    expect($book->currentReading->refresh()->status)->toBe(ReadingStatus::Read)
        ->and($saved['finished'])->toBeTrue()
        ->and($saved['days'])->toBe(6)
        ->and($saved['next'])->toBe(['id' => $next->id, 'title' => $next->title]);
});

test('cadastrar como lido usa a data de término informada', function () {
    $this->post(route('books.store'), [
        'title' => 'Lido antes do app',
        'status' => 'read',
        'finished_on' => '2025-03-02',
    ])->assertRedirect();

    $reading = Book::query()->sole()->currentReading;
    expect($reading->finished_at?->toDateString())->toBe('2025-03-02')
        ->and($reading->started_at?->toDateString())->toBe('2025-03-02');
});

test('a atividade do perfil chama a releitura de releitura', function () {
    $book = finishedBook();
    app(ReadingService::class)->startReread($book, ReadingStatus::Reading);

    $this->get(route('profile.show'))
        ->assertInertia(fn (Assert $page) => $page->where('activity.0.type', 'reread'));
});

test('tirar da fila pelo livro', function () {
    $book = lifecycleBook(ReadingStatus::WantToRead);
    app(QueueService::class)->add($book);

    $this->delete(route('queue.books.destroy', $book))->assertRedirect();

    expect(QueueItem::query()->count())->toBe(0)
        ->and(lastToast()['title'])->toBe('Tirado da fila');
});

test('só a última ação se desfaz: um desfazer antigo não reverte o que veio depois', function () {
    $books = collect(range(1, 3))->map(fn () => lifecycleBook(ReadingStatus::WantToRead));
    $books->each(fn (Book $book) => app(QueueService::class)->add($book));

    $this->delete(route('queue.books.destroy', $books[1]));
    $first = lastToast()['undo'];
    $this->delete(route('queue.books.destroy', $books[2]));
    $second = lastToast()['undo'];

    $this->post(route('undo', $first));
    expect(lastToast()['kind'])->toBe('error')
        ->and(QueueItem::query()->pluck('book_id')->all())->toBe([$books[0]->id]);

    $this->post(route('undo', $second));
    expect(QueueItem::query()->orderBy('position')->pluck('book_id')->all())->toBe([$books[0]->id, $books[2]->id]);
});

test('trocar a capa por arquivo salva a imagem e não oferece desfazer', function () {
    $book = Book::factory()->create(['title' => 'Com capa']);
    Reading::factory()->for($book)->create();

    $this->post(route('books.update', $book), [
        '_method' => 'patch',
        'title' => 'Com capa',
        'cover_file' => UploadedFile::fake()->image('capa.jpg', 300, 450),
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($book->refresh()->cover_path)->toBe("covers/{$book->id}.jpg")
        ->and(Storage::disk('local')->exists($book->cover_path))->toBeTrue()
        ->and(lastToast()['sub'])->toBe('capa nova salva')
        ->and(lastToast()['undo'])->toBeNull();
});
