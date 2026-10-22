<?php

use App\Enums\NoteKind;
use App\Models\Book;
use App\Models\Note;
use App\Models\Tag;
use Inertia\Testing\AssertableInertia as Assert;

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

test('criar uma nota no detalhe do livro volta para o livro', function () {
    $book = Book::factory()->create(['title' => 'Torto Arado']);
    $bookPage = route('books.show', $book);

    $this->from($bookPage)->post(route('notes.store'), notePayload($book))->assertRedirect($bookPage);

    expect(Note::sole()->page)->toBe(42);
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

test('nota com página em branco é aceita e corpo vazio não', function () {
    $book = Book::factory()->create();

    $this->post(route('notes.store'), notePayload($book, ['page' => '  ']))->assertRedirect();

    expect(Note::sole()->page)->toBeNull();

    $this->post(route('notes.store'), notePayload($book, ['body_md' => '']))
        ->assertSessionHasErrors(['body_md' => 'Escreva o texto da nota.']);

    $this->post(route('notes.store'), notePayload($book, ['kind' => 'nope']))
        ->assertSessionHasErrors('kind');
});

test('exclui a nota, leva as tags junto da ligação e volta para o livro', function () {
    $book = Book::factory()->create();
    $bookPage = route('books.show', $book);

    $this->post(route('notes.store'), notePayload($book, ['body_md' => 'Algo #tag']));
    $note = Note::sole();

    $this->from($bookPage)->delete(route('notes.destroy', $note))->assertRedirect($bookPage);

    $this->assertDatabaseCount('notes', 0);
    $this->assertDatabaseCount('note_tag', 0);
});

test('o detalhe do livro traz as notas dele e os tipos para o editor', function () {
    $book = Book::factory()->create();
    Note::factory()->create(['book_id' => $book->id, 'body_md' => 'Do livro']);
    Note::factory()->create(['body_md' => 'De outro livro']);

    $this->get(route('books.show', $book))
        ->assertInertia(fn (Assert $page) => $page
            ->component('book')
            ->has('notes', 1)
            ->has('note_kinds', count(NoteKind::cases()))
            ->where('queued', false));
});
