<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use App\Models\Reading;
use App\Models\ReadingSession;
use App\Services\ReadingService;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Carbon::setTestNow('2026-10-14 22:30:00');
});

/** Livro de 300 páginas em "lendo", já com a página atual definida. */
function readingAt(int $page, ReadingStatus $status = ReadingStatus::Reading): Reading
{
    $book = Book::factory()->onShelf($status)->create(['pages' => 300]);
    $reading = $book->currentReading;
    $reading->update(['current_page' => $page]);

    return $reading->refresh();
}

test('primeira sessão começa na página 1 e avança a página atual', function () {
    $reading = readingAt(0);

    $session = app(ReadingService::class)->registerSession($reading, 25, 40, Carbon::today());

    expect($session->page_from)->toBe(1)
        ->and($session->page_to)->toBe(25)
        ->and($session->minutes)->toBe(40)
        ->and($reading->refresh()->current_page)->toBe(25)
        ->and($session->read_on->toDateString())->toBe('2026-10-14');
});

test('a página inicial de cada sessão é a anterior mais um', function () {
    $reading = readingAt(25);

    $session = app(ReadingService::class)->registerSession($reading, 60, null, Carbon::today());

    expect($session->page_from)->toBe(26)
        ->and($session->pages())->toBe(35)
        ->and($session->minutes)->toBeNull();
});

test('sessão em quero ler passa o livro para lendo', function () {
    $reading = readingAt(0, ReadingStatus::WantToRead);

    app(ReadingService::class)->registerSession($reading, 10, null, Carbon::today());

    expect($reading->refresh()->status)->toBe(ReadingStatus::Reading)
        ->and($reading->started_at?->toDateString())->toBe('2026-10-14');
});

test('não aceita página igual ou anterior à atual', function (int $pageTo) {
    $reading = readingAt(50);

    app(ReadingService::class)->registerSession($reading, $pageTo, null, Carbon::today());
})->with([50, 30])->throws(ValidationException::class, 'Informe uma página depois da pág. 50.');

test('não aceita página acima do número de páginas do livro', function () {
    $reading = readingAt(290);

    app(ReadingService::class)->registerSession($reading, 301, null, Carbon::today());
})->throws(ValidationException::class, 'O livro tem 300 páginas.');

test('livro sem número de páginas aceita qualquer página', function () {
    $book = Book::factory()->onShelf(ReadingStatus::Reading)->create(['pages' => null]);
    $reading = $book->currentReading;

    $session = app(ReadingService::class)->registerSession($reading, 5000, null, Carbon::today());

    expect($session->page_to)->toBe(5000)
        ->and(app(ReadingService::class)->progress($reading->refresh()))
        ->toMatchArray(['percent' => null, 'days_left' => null, 'finish_suggested' => false]);
});

test('lido e abandonado não recebem sessão até voltar para lendo', function (ReadingStatus $status) {
    $reading = readingAt(300, $status);

    app(ReadingService::class)->registerSession($reading, 301, null, Carbon::today());
})->with([ReadingStatus::Read, ReadingStatus::Abandoned])
    ->throws(ValidationException::class, 'Mude a estante para "Lendo" para registrar sessões.');

test('editar a última sessão recalcula a página atual pela maior registrada', function () {
    $reading = readingAt(0);
    $service = app(ReadingService::class);
    $first = $service->registerSession($reading, 20, null, Carbon::today());
    $last = $service->registerSession($reading->refresh(), 40, null, Carbon::today());

    $service->updateSession($last, Carbon::today(), 35, 30);

    expect($reading->refresh()->current_page)->toBe(35)
        ->and($last->refresh()->minutes)->toBe(30)
        ->and($first->refresh()->page_to)->toBe(20);
});

test('editar sessão não permite página antes do início dela', function () {
    $reading = readingAt(0);
    $service = app(ReadingService::class);
    $service->registerSession($reading, 20, null, Carbon::today());
    $second = $service->registerSession($reading->refresh(), 40, null, Carbon::today());

    $service->updateSession($second, Carbon::today(), 20, null);
})->throws(ValidationException::class, 'Use uma página a partir da 21.');

test('apagar a última sessão volta a página atual para a anterior', function () {
    $reading = readingAt(0);
    $service = app(ReadingService::class);
    $service->registerSession($reading, 20, null, Carbon::today());
    $last = $service->registerSession($reading->refresh(), 40, null, Carbon::today());

    $service->deleteSession($last);

    expect($reading->refresh()->current_page)->toBe(20)
        ->and(ReadingSession::count())->toBe(1);
});

test('apagar a última sessão não desfaz uma marcação manual de lido', function () {
    $reading = readingAt(0);
    $service = app(ReadingService::class);
    $only = $service->registerSession($reading, 80, null, Carbon::today());
    $reading->update(['current_page' => 300]);

    $service->deleteSession($only);

    expect($reading->refresh()->current_page)->toBe(300);
});

test('apagar a última sessão sem outras não zera o progresso', function () {
    $reading = readingAt(0);
    $service = app(ReadingService::class);
    $only = $service->registerSession($reading, 80, null, Carbon::today());

    $service->deleteSession($only);

    expect($reading->refresh()->current_page)->toBe(80);
});

test('progresso calcula percentual, ritmo e dias restantes', function () {
    $reading = readingAt(0);
    $service = app(ReadingService::class);

    // 40 páginas em um dia, 20 no seguinte: ritmo de 30 páginas por dia de leitura.
    Carbon::setTestNow('2026-10-10 20:00:00');
    $service->registerSession($reading, 40, null, Carbon::today());
    Carbon::setTestNow('2026-10-11 20:00:00');
    $service->registerSession($reading->refresh(), 60, null, Carbon::today());

    $progress = $service->progress($reading->refresh());

    expect($progress)->toMatchArray([
        'current_page' => 60,
        'pages' => 300,
        'percent' => 20,
        'pace' => 30.0,
        'days_left' => 8,
        'finish_suggested' => false,
    ]);
});

test('chegar à última página sugere marcar como lido, sem mudar a estante', function () {
    $reading = readingAt(0);

    app(ReadingService::class)->registerSession($reading, 300, null, Carbon::today());

    $reading->refresh();

    expect($reading->status)->toBe(ReadingStatus::Reading)
        ->and(app(ReadingService::class)->progress($reading)['finish_suggested'])->toBeTrue();
});

test('a rota registra sessão no livro e recusa dados inválidos', function () {
    $book = Book::factory()->onShelf(ReadingStatus::Reading)->create(['pages' => 300]);

    $this->post(route('sessions.store', $book), ['page_to' => 12, 'minutes' => 25])->assertRedirect();

    expect($book->currentReading->refresh()->current_page)->toBe(12)
        ->and(ReadingSession::sole()->minutes)->toBe(25);

    $this->post(route('sessions.store', $book), ['page_to' => 'abc'])->assertSessionHasErrors('page_to');
    $this->post(route('sessions.store', $book), ['page_to' => 10])->assertSessionHasErrors('page_to');
});

test('a rota corrige e apaga sessões', function () {
    $reading = readingAt(0);
    $session = app(ReadingService::class)->registerSession($reading, 20, null, Carbon::today());

    $this->patch(route('sessions.update', $session), ['read_on' => '2026-10-13', 'page_to' => 22, 'minutes' => null])
        ->assertRedirect();

    expect($session->refresh()->read_on->toDateString())->toBe('2026-10-13')
        ->and($session->page_to)->toBe(22);

    $this->delete(route('sessions.destroy', $session))->assertRedirect();

    expect(ReadingSession::count())->toBe(0);
});
