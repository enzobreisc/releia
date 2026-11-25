<?php

use App\Enums\BookSource;
use App\Models\Book;
use App\Services\Ai\EmbeddingText;
use App\Services\BookLookup\BookCandidate;

function embeddingCandidate(string $title, array $authors = [], ?string $genre = null): BookCandidate
{
    return new BookCandidate(title: $title, source: BookSource::OpenLibrary, authors: $authors, genre: $genre);
}

test('a book and a candidate with the same title, authors and genre produce the same text', function () {
    $book = Book::factory()->withAuthors(['Machado de Assis'])->create(['title' => 'Dom Casmurro', 'genre' => 'Romance']);

    expect(EmbeddingText::forBook($book))->toBe(EmbeddingText::forCandidate(embeddingCandidate('Dom Casmurro', ['Machado de Assis'], 'Romance')));
});

test('composes the title, the authors and the genre separated by periods', function () {
    expect(EmbeddingText::forCandidate(embeddingCandidate('Dom Casmurro', ['Machado de Assis', 'Outro Autor'], 'Romance')))
        ->toBe('Dom Casmurro. Machado de Assis, Outro Autor. Romance');
});

test('omits the empty authors and genre', function () {
    expect(EmbeddingText::forCandidate(embeddingCandidate('Dom Casmurro')))->toBe('Dom Casmurro');
});

test('maps a Portuguese genre to its English Open Library subject', function () {
    expect(EmbeddingText::forCandidate(embeddingCandidate('O Hobbit', ['J. R. R. Tolkien'], 'Fantasia')))
        ->toBe('O Hobbit. J. R. R. Tolkien. Fantasy');
});

test('keeps a genre without an English subject as it is', function () {
    expect(EmbeddingText::forCandidate(embeddingCandidate('Diário', [], 'Crônicas')))->toBe('Diário. Crônicas');
});

test('cuts the text at 512 characters without splitting a multibyte character', function () {
    $text = EmbeddingText::forCandidate(embeddingCandidate(str_repeat('ç', 600)));

    expect(mb_strlen($text))->toBe(512)
        ->and(mb_check_encoding($text, 'UTF-8'))->toBeTrue();
});

test('a different prefix changes the hash of the same text', function () {
    $text = 'Dom Casmurro';

    expect(EmbeddingText::hash($text, 'clustering: '))
        ->not->toBe(EmbeddingText::hash($text, 'search: '))
        ->toBe(hash('sha256', 'clustering: '.$text));
});
