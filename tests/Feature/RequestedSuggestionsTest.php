<?php

use App\Enums\RecommendationStatus;
use App\Models\Book;
use App\Models\Recommendation;
use App\Services\Recommendation\RequestedSuggestions;
use App\Services\Recommendation\SuggestionRequest;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(fn () => Storage::fake('local'));

/**
 * Open Library lists the works of "Autor {n}" on its first page only. A work is {pages, coauthors}, and its edition
 * may have its own {editionPages, editionCoauthors}; works are numbered from 1 in each author's list, and their
 * Brazilian ISBN names the author and the position.
 *
 * @param  array<int, list<array{pages: ?int, coauthors?: list<int>, editionPages?: ?int, editionCoauthors?: list<int>}>>  $worksByAuthor
 */
function fakeCatalog(array $worksByAuthor): void
{
    Http::fake(function (Request $request) use ($worksByAuthor) {
        parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
        $url = urldecode($request->url());

        if (isset($query['author'])) {
            $author = (int) substr($query['author'], strlen('Autor '));

            return Http::response(['docs' => (($query['page'] ?? 1) == 1) ? catalogDocs($worksByAuthor, $author) : []]);
        }

        if (preg_match('/bibkeys=ISBN:(\d{13})/', $url, $match) === 1) {
            $work = catalogWorkOf($worksByAuthor, $match[1]);

            return $work === null ? Http::response([]) : Http::response(["ISBN:{$match[1]}" => [
                'title' => "Edição {$work['author']}.{$work['position']}",
                'authors' => array_map(fn (int $number) => ['name' => "Autor {$number}"], $work['editionAuthors']),
                'cover' => ['large' => 'https://covers.openlibrary.org/b/id/1-L.jpg'],
                'number_of_pages' => $work['editionPages'],
                'subjects' => [['name' => 'Fiction']],
                'description' => 'x',
            ]]);
        }

        return Http::response([], 404);
    });
}

function catalogIsbn(int $author, int $work): string
{
    $body = sprintf('97885%03d%02d%02d', $author, 1, $work);
    $sum = 0;

    foreach (str_split($body) as $position => $digit) {
        $sum += (int) $digit * ($position % 2 === 0 ? 1 : 3);
    }

    return $body.((10 - $sum % 10) % 10);
}

/** @return list<array<string, mixed>> */
function catalogDocs(array $worksByAuthor, int $author): array
{
    $docs = [];

    foreach ($worksByAuthor[$author] ?? [] as $position => $work) {
        $isbn = catalogIsbn($author, $position + 1);
        $docs[] = [
            'key' => "/works/OL{$author}{$position}W",
            'title' => "Obra {$author}.".($position + 1),
            'author_name' => [
                "Autor {$author}",
                ...array_map(fn (int $co) => "Autor {$co}", $work['coauthors'] ?? []),
            ],
            'isbn' => [$isbn],
            'number_of_pages_median' => $work['pages'],
            'cover_i' => 1,
        ];
    }

    return $docs;
}

/** @return array{author: int, position: int, editionPages: ?int, editionAuthors: list<int>}|null */
function catalogWorkOf(array $worksByAuthor, string $isbn): ?array
{
    foreach ($worksByAuthor as $author => $works) {
        foreach ($works as $position => $work) {
            if (catalogIsbn($author, $position + 1) === $isbn) {
                return [
                    'author' => $author,
                    'position' => $position + 1,
                    'editionPages' => array_key_exists('editionPages', $work) ? $work['editionPages'] : ($work['pages'] ?? 200),
                    'editionAuthors' => [$author, ...($work['editionCoauthors'] ?? $work['coauthors'] ?? [])],
                ];
            }
        }
    }

    return null;
}

function requestedSearch(array $authors, array $excluded = [], ?int $maxPages = null): array
{
    return app(RequestedSuggestions::class)->search(new SuggestionRequest('pedido de teste', $authors, $excluded, $maxPages));
}

function libraryAuthorNamed(string $name): void
{
    Book::factory()->withAuthors([$name])->create();
}

function editionsLookedUp(): int
{
    return Http::recorded(fn (Request $request) => str_contains(urldecode($request->url()), 'bibkeys='))->count();
}

test('a requested author gives every book of theirs, not three, with the page count', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => array_fill(0, 5, ['pages' => 200])]);

    $ids = requestedSearch(['Autor 1']);

    $suggestions = Recommendation::query()->whereIn('id', $ids)->get();

    expect($suggestions)->toHaveCount(5)
        ->and($suggestions->first()->reason)->toBe('Autor 1, como você pediu · 200 páginas');
});

test('a requested author with more than twenty books gives twenty', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => array_fill(0, 25, ['pages' => 200])]);

    expect(requestedSearch(['Autor 1']))->toHaveCount(20);
});

test('an excluded author is never in the result, even as a co-author', function () {
    libraryAuthorNamed('Autor 1');
    libraryAuthorNamed('Autor 2');
    fakeCatalog([
        1 => [['pages' => 200, 'coauthors' => [2]], ['pages' => 210]],
    ]);

    $ids = requestedSearch(['Autor 1'], ['Autor 2']);

    expect(Recommendation::query()->whereIn('id', $ids)->pluck('author')->all())->toBe(['Autor 1']);
});

test('an excluded author is not searched as a source when no author is requested', function () {
    ratedBook('Livro do Autor 2', 'Autor 2', 5);
    ratedBook('Livro do Autor 3', 'Autor 3', 5);
    fakeCatalog([2 => [['pages' => 200]], 3 => [['pages' => 200]]]);

    requestedSearch([], ['Autor 2']);

    expect(Http::recorded(fn (Request $request) => str_contains(urldecode($request->url()), 'author=Autor 2')))->toHaveCount(0)
        ->and(Http::recorded(fn (Request $request) => str_contains(urldecode($request->url()), 'author=Autor 3')))->not->toHaveCount(0);
});

test('a work with more pages than the limit is dropped before its edition is looked up', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => [['pages' => 200], ['pages' => 400], ['pages' => 300]]]);

    $ids = requestedSearch(['Autor 1'], [], 300);

    expect(Recommendation::query()->whereIn('id', $ids)->count())->toBe(2)
        ->and(editionsLookedUp())->toBe(2);
});

test('a work whose page count is unknown is dropped when there is a page limit', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => [['pages' => null], ['pages' => 200]]]);

    expect(requestedSearch(['Autor 1'], [], 300))->toHaveCount(1);
});

test('a pending suggestion by a requested author is in the result and is not created again', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => array_fill(0, 3, ['pages' => 200])]);
    $pending = Recommendation::factory()->create(['title' => 'Edição 1.1', 'author' => 'Autor 1', 'status' => RecommendationStatus::New]);

    $ids = requestedSearch(['Autor 1']);

    expect($ids)->toContain($pending->id)
        ->and($ids)->toHaveCount(3)
        ->and(Recommendation::query()->where('title', 'Edição 1.1')->count())->toBe(1);
});

test('pending suggestions are left out when there is a page limit', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => [['pages' => 200]]]);
    $pending = Recommendation::factory()->create(['title' => 'Antiga', 'author' => 'Autor 1', 'status' => RecommendationStatus::New]);

    expect(requestedSearch(['Autor 1'], [], 300))->not->toContain($pending->id);
});

test('expired suggestions by a requested author can all come back', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => array_fill(0, 3, ['pages' => 200])]);
    foreach (['Edição 1.1', 'Edição 1.2', 'Edição 1.3'] as $title) {
        Recommendation::factory()->create(['title' => $title, 'author' => 'Autor 1', 'status' => RecommendationStatus::Expired]);
    }

    expect(requestedSearch(['Autor 1']))->toHaveCount(3);
});

test('the ids of the result are kept when the pending list overflows', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => [['pages' => 200]]]);
    $kept = Recommendation::factory()->create(['title' => 'Antiga', 'author' => 'Autor 1', 'status' => RecommendationStatus::New]);
    Recommendation::factory()->count(60)->create(['status' => RecommendationStatus::New]);

    requestedSearch(['Autor 1']);

    expect($kept->fresh()->status)->toBe(RecommendationStatus::New);
});

test('the combined limit is twenty, with the pending suggestions taking their places', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => array_fill(0, 25, ['pages' => 200])]);
    $pending = Recommendation::factory()->count(5)->create(['author' => 'Autor 1', 'status' => RecommendationStatus::New]);

    $ids = requestedSearch(['Autor 1']);

    expect($ids)->toHaveCount(20)
        ->and($ids)->toContain(...$pending->pluck('id')->all());
});

test('an edition longer than the limit is dropped even when the work is within it', function () {
    libraryAuthorNamed('Autor 1');
    fakeCatalog([1 => [['pages' => 200, 'editionPages' => 400], ['pages' => 200, 'editionPages' => 250]]]);

    expect(requestedSearch(['Autor 1'], [], 300))->toHaveCount(1);
});

test('an excluded author who is only on the edition is not in the result', function () {
    libraryAuthorNamed('Autor 1');
    libraryAuthorNamed('Autor 2');
    fakeCatalog([1 => [['pages' => 200, 'editionCoauthors' => [2]], ['pages' => 200]]]);

    $ids = requestedSearch(['Autor 1'], ['Autor 2']);

    expect(Recommendation::query()->whereIn('id', $ids)->count())->toBe(1);
});

test('a pending suggestion is found again when the edition spells the author differently', function () {
    libraryAuthorNamed('Lev Tolstói');
    fakeCatalog([]);
    $pending = Recommendation::factory()->create(['title' => 'Guerra e Paz', 'author' => 'Liev Tolstói', 'status' => RecommendationStatus::New]);

    expect(requestedSearch(['Lev Tolstói']))->toContain($pending->id);
});
