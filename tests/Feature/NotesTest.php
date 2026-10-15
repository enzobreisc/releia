<?php

use App\Enums\NoteKind;
use App\Models\Book;
use App\Models\Note;
use App\Models\Tag;
use App\Services\NoteReviewService;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Carbon::setTestNow('2026-10-14 22:30:00');
});

/**
 * @return array<string, mixed>
 */
function notePayload(Book $book, array $overrides = []): array
{
    return [
        'book_id' => $book->id,
        'kind' => 'excerpt',
        'page' => '42',
        'body_md' => 'Um trecho importante sobre a terra',
        ...$overrides,
    ];
}

test('um trecho anotado hoje aparece na revisão do dia seguinte', function () {
    $book = Book::factory()->create(['title' => 'Torto Arado']);

    $this->post(route('notes.store'), notePayload($book))->assertRedirect();

    $note = Note::sole();

    expect($note->next_review_at->toDateString())->toBe('2026-10-15')
        ->and($note->review_count)->toBe(0)
        ->and($note->page)->toBe(42);

    // Hoje ainda não é dia de revisar.
    $this->get(route('notes.index'))
        ->assertInertia(fn (Assert $page) => $page->where('review.count', 0));

    Carbon::setTestNow('2026-10-15 08:00:00');

    $this->get(route('notes.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('review.count', 1)
            ->where('review.books', 1)
            ->where('review.notes.0.id', $note->id));
});

test('revisar reagenda pelos intervalos crescentes e os mantém depois do último', function () {
    $note = Note::factory()->create(['next_review_at' => '2026-10-14', 'review_count' => 0]);
    $reviews = app(NoteReviewService::class);
    $today = Carbon::today();

    expect(collect(range(0, 8))->map(fn (int $count) => $today->diffInDays($reviews->nextReviewDate($count, $today)))->all())
        ->toEqual([1, 3, 7, 14, 30, 60, 120, 120, 120]);

    $this->post(route('notes.review', $note))->assertRedirect();

    $note->refresh();

    expect($note->review_count)->toBe(1)
        ->and($note->next_review_at->toDateString())->toBe('2026-10-17');

    // Revisão atrasada conta como revisão feita, sem voltar a data.
    Carbon::setTestNow('2026-10-30 09:00:00');
    $this->post(route('notes.review', $note))->assertRedirect();

    $note->refresh();

    expect($note->review_count)->toBe(2)
        ->and($note->next_review_at->toDateString())->toBe('2026-11-06');
});

test('nota revisada hoje sai da revisão do dia', function () {
    $note = Note::factory()->create(['next_review_at' => '2026-10-14']);

    expect(app(NoteReviewService::class)->dueOn(Carbon::today())->count())->toBe(1);

    $this->post(route('notes.review', $note));

    expect(app(NoteReviewService::class)->dueOn(Carbon::today())->count())->toBe(0);
});

test('extrai tags do texto sem pegar títulos, âncoras nem trechos de palavra', function () {
    $body = "## Título\nVeja #Filosofia e #não-ficção, mais #filosofia.\nLink: https://ex.com/a#frag, a#b e ##dupla";

    expect(Note::extractTags($body))->toBe(['filosofia', 'nao-ficcao']);
});

test('as tags da nota acompanham o texto ao editar', function () {
    $book = Book::factory()->create();

    $this->post(route('notes.store'), notePayload($book, ['body_md' => 'Ideia #leitura #sono']))->assertRedirect();

    $note = Note::sole();

    expect($note->tags->pluck('name')->sort()->values()->all())->toBe(['leitura', 'sono']);

    $this->patch(route('notes.update', $note), notePayload($book, ['body_md' => 'Só #leitura agora']))->assertRedirect();

    expect($note->refresh()->tags->pluck('name')->all())->toBe(['leitura'])
        ->and(Tag::query()->count())->toBe(2);
});

test('busca ignora acentos e maiúsculas no texto e nas tags', function () {
    $book = Book::factory()->create();
    Note::factory()->create(['book_id' => $book->id, 'body_md' => 'Uma reflexão sobre a ação humana']);
    Note::factory()->create(['book_id' => $book->id, 'body_md' => 'Outra coisa #Ficção']);
    Note::factory()->create(['book_id' => $book->id, 'body_md' => 'Nada a ver']);

    $this->get(route('notes.index', ['q' => 'REFLEXAO acao']))
        ->assertInertia(fn (Assert $page) => $page->has('notes', 1)->where('notes.0.body_md', 'Uma reflexão sobre a ação humana'));

    $this->get(route('notes.index', ['q' => 'ficcao']))
        ->assertInertia(fn (Assert $page) => $page->has('notes', 1));
});

test('filtra por livro, tipo e tag', function () {
    $torto = Book::factory()->create(['title' => 'Torto Arado']);
    $other = Book::factory()->create(['title' => 'Outro']);

    Note::factory()->create(['book_id' => $torto->id, 'kind' => NoteKind::Quote, 'body_md' => 'Citação #terra']);
    Note::factory()->create(['book_id' => $torto->id, 'kind' => NoteKind::Reflection, 'body_md' => 'Reflexão']);
    Note::factory()->create(['book_id' => $other->id, 'kind' => NoteKind::Quote, 'body_md' => 'Outra #terra']);

    $this->get(route('notes.index', ['book' => $torto->id]))
        ->assertInertia(fn (Assert $page) => $page->has('notes', 2));

    $this->get(route('notes.index', ['kind' => 'quote']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('notes', 2)
            ->where('kind_counts.quote', 2));

    $this->get(route('notes.index', ['tag' => '#terra', 'kind' => 'quote']))
        ->assertInertia(fn (Assert $page) => $page->has('notes', 2)->has('tags', 1));
});

test('nota com página em branco é aceita e corpo vazio não', function () {
    $book = Book::factory()->create();

    $this->post(route('notes.store'), notePayload($book, ['page' => '  ']))->assertRedirect();

    expect(Note::sole()->page)->toBeNull();

    $this->post(route('notes.store'), notePayload($book, ['body_md' => '']))
        ->assertSessionHasErrors(['body_md' => 'Escreva o texto da nota.']);

    $this->post(route('notes.store'), notePayload($book, ['kind' => 'nope']))
        ->assertSessionHasErrors('kind');
});

test('exclui a nota e leva as tags junto da ligação', function () {
    $book = Book::factory()->create();

    $this->post(route('notes.store'), notePayload($book, ['body_md' => 'Algo #tag']));
    $note = Note::sole();

    $this->delete(route('notes.destroy', $note))->assertRedirect(route('notes.index'));

    $this->assertDatabaseCount('notes', 0);
    $this->assertDatabaseCount('note_tag', 0);
});

test('a tela de notas abre e a nota selecionada vem na página', function () {
    $note = Note::factory()->create(['body_md' => 'Selecionada']);

    $this->get(route('notes.index'))
        ->assertInertia(fn (Assert $page) => $page->component('notes')->where('selected', null));

    $this->get(route('notes.index', ['note' => $note->id, 'new' => 1]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('notes')
            ->where('selected.id', $note->id)
            ->where('creating', true)
            ->has('books'));
});

test('o detalhe do livro traz as notas dele', function () {
    $book = Book::factory()->create();
    Note::factory()->create(['book_id' => $book->id, 'body_md' => 'Do livro']);
    Note::factory()->create(['body_md' => 'De outro livro']);

    $this->get(route('books.show', $book))
        ->assertInertia(fn (Assert $page) => $page
            ->component('book')
            ->has('notes', 1)
            ->where('queued', false));
});
