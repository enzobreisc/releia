<?php

use App\Enums\ReadingStatus;
use App\Models\Book;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(fn () => Http::preventStrayRequests())
    ->in('Feature');

/**
 * @return array<mixed>
 */
function apiFixture(string $path): array
{
    return json_decode((string) file_get_contents(__DIR__.'/Fixtures/'.$path), true);
}

function fakeOpenLibrary(): void
{
    Http::fake(function (Request $request) {
        $url = urldecode($request->url());

        // The Brazilian edition confirms the Portuguese title by ISBN.
        if (preg_match('/bibkeys=ISBN:(\d{13})/', $url, $match) === 1) {
            $doc = openLibraryIndex()[$match[1]] ?? null;

            return Http::response($doc === null ? [] : ["ISBN:{$match[1]}" => [
                'title' => $doc['title'],
                'authors' => array_map(fn (string $name) => ['name' => $name], $doc['author_name'] ?? []),
                'cover' => ['large' => 'https://covers.openlibrary.org/b/id/1-L.jpg'],
                'number_of_pages' => 200,
                'subjects' => [['name' => 'Fiction']],
                'description' => 'x',
            ]]);
        }

        if (str_contains($url, 'brasilapi') || str_contains($url, 'googleapis')) {
            return Http::response([], 404);
        }

        return match (true) {
            str_contains($url, 'author=Itamar') => Http::response(apiFixture('open-library/search-author-itamar-vieira.json')),
            str_contains($url, 'author=Machado') => Http::response(apiFixture('open-library/search-author-machado-de-assis.json')),
            default => Http::response(['docs' => []]),
        };
    });
}

/**
 * @return array<string, array<string, mixed>>
 */
function openLibraryIndex(): array
{
    $index = [];

    foreach (['search-author-itamar-vieira', 'search-author-machado-de-assis'] as $name) {
        foreach (apiFixture("open-library/{$name}.json")['docs'] as $doc) {
            foreach ($doc['isbn'] ?? [] as $isbn) {
                $index[$isbn] ??= $doc;
            }
        }
    }

    return $index;
}

function ratedBook(string $title, string $author, int $rating, ?string $genre = null, ?string $isbn = null): Book
{
    $book = Book::factory()->withAuthors([$author])->create([
        'title' => $title,
        'genre' => $genre,
        'isbn_13' => $isbn,
    ]);

    $book->readings()->create(['status' => ReadingStatus::Read, 'rating' => $rating]);

    return $book;
}

function configuredEmbeddingModel(): string
{
    return config()->string('services.ollama.embedding_model');
}

/**
 * Answers Ollama embed requests and lets every other request fall through to the next fake.
 *
 * @param  (Closure(string): list<float>)|null  $vectorFor  vector of each input, prefix included
 */
function fakeOllamaEmbeddings(int $status = 200, ?Closure $vectorFor = null): void
{
    Http::fake(function (Request $request) use ($status, $vectorFor) {
        if (! str_contains($request->url(), '/api/embed')) {
            return null;
        }

        if ($status !== 200) {
            return Http::response([], $status);
        }

        $vectorFor ??= fn (): array => [0.5, -0.25];

        return Http::response(['embeddings' => array_map($vectorFor, $request['input'])]);
    });
}
