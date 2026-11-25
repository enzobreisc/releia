<?php

use App\Models\Book;
use Illuminate\Support\Facades\Http;

test('prints how many books were indexed', function () {
    fakeOllamaEmbeddings();
    Book::factory()->count(2)->create();

    $this->artisan('releia:embed')
        ->expectsOutput('2 livros indexados.')
        ->assertSuccessful();
});

test('warns and succeeds when Ollama answers with an error', function () {
    Http::fake(['*' => Http::response(['error' => 'model not found'], 500)]);
    Book::factory()->create();

    $this->artisan('releia:embed')
        ->expectsOutputToContain('Ollama indisponível.')
        ->assertSuccessful();
});
