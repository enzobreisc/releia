<?php

use App\Models\Book;
use App\Models\Recommendation;
use App\Services\BookLookup\BookCandidate;
use App\Services\BookLookup\PreferredPublishers;
use App\Services\BookLookupService;
use App\Services\RecommendationService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

function fakeEditions(array $publishersByIsbn): void
{
    $entries = [];

    foreach ($publishersByIsbn as $isbn => [$publisher, $year]) {
        $entries[] = ['title' => 'Crime e castigo', 'isbn_13' => [(string) $isbn], 'publishers' => [$publisher], 'publish_date' => (string) $year];
    }

    Http::fake(['openlibrary.org/works/OL1W/editions.json*' => Http::response(['entries' => $entries])]);
}

function ownBooksFrom(string ...$publishers): void
{
    foreach ($publishers as $publisher) {
        Book::factory()->create(['publisher' => $publisher]);
    }
}

function publishersOfEditions(): array
{
    return array_map(fn (BookCandidate $edition) => $edition->publisher, app(BookLookupService::class)->editions('OL1W'));
}

test('editions from the publishers you own most come first', function () {
    fakeEditions([
        '9788500000010' => ['Outra', 2024],
        '9788535900019' => ['Companhia das Letras', 2010],
        '9788573260014' => ['Editora 34', 2001],
    ]);
    ownBooksFrom('Editora 34', 'editora 34', 'Companhia das Letras');

    expect(publishersOfEditions())->toBe(['Editora 34', 'Companhia das Letras', 'Outra']);
});

test('a publisher is recognized without the word editora', function () {
    fakeEditions(['9788500000010' => ['Outra', 2024], '9788573260014' => ['Ed. 34', 2001]]);
    ownBooksFrom('Editora 34');

    expect(publishersOfEditions())->toBe(['Ed. 34', 'Outra']);
});

test('a Brazilian edition still comes before a foreign one from a publisher you own', function () {
    fakeEditions(['9781400079988' => ['Vintage', 2024], '9788500000010' => ['Outra', 2001]]);
    ownBooksFrom('Vintage');

    expect(publishersOfEditions())->toBe(['Outra', 'Vintage']);
});

test('a new book changes the order of editions already cached', function () {
    fakeEditions(['9788500000010' => ['Outra', 2024], '9788573260014' => ['Editora 34', 2001]]);

    expect(publishersOfEditions())->toBe(['Outra', 'Editora 34']);

    ownBooksFrom('Editora 34');

    expect(publishersOfEditions())->toBe(['Editora 34', 'Outra']);
});

const OTHER_ISBN = '9788500000010';
const OWNED_REGISTRANT_ISBN = '9788573265040';

function ownBookWithIsbn(string $isbn): void
{
    ratedBook('Noites brancas', 'Fiódor Dostoiévski', 5, isbn: $isbn);
}

/**
 * @param  array<string, bool>  $knownEditions  ISBN => whether the catalog lists its author
 */
function fakeWorkWithTwoEditions(array $knownEditions): void
{
    Http::fake(function (Request $request) use ($knownEditions) {
        $url = urldecode($request->url());

        foreach ($knownEditions as $isbn => $hasAuthor) {
            if (str_contains($url, "brasilapi.com.br/api/isbn/v1/{$isbn}")) {
                return Http::response(['title' => 'Crime e castigo', 'authors' => $hasAuthor ? ['Fiódor Dostoiévski'] : []]);
            }
        }

        if (($request->data()['author'] ?? null) !== null) {
            return Http::response(['docs' => [[
                'key' => '/works/OL1W',
                'title' => 'Crime e castigo',
                'author_name' => ['Fiódor Dostoiévski'],
                'isbn' => [OTHER_ISBN, OWNED_REGISTRANT_ISBN],
            ]]]);
        }

        return Http::response([], 404);
    });
}

function suggestedIsbn(): ?string
{
    Storage::fake('local');
    app(RecommendationService::class)->generate();

    return Recommendation::sole()->isbn_13;
}

test('the suggested edition is the one from a publisher you own, recognized by its ISBN', function () {
    fakeWorkWithTwoEditions([OTHER_ISBN => true, OWNED_REGISTRANT_ISBN => true]);
    ownBookWithIsbn('9788573263107');

    expect(suggestedIsbn())->toBe(OWNED_REGISTRANT_ISBN);
});

test('without a publisher in common, the first Brazilian edition is suggested', function () {
    fakeWorkWithTwoEditions([OTHER_ISBN => true, OWNED_REGISTRANT_ISBN => true]);
    ownBookWithIsbn('9788535906097');

    expect(suggestedIsbn())->toBe(OTHER_ISBN);
});

test('a preferred edition the catalogs cannot describe gives way to the first one', function (array $known) {
    fakeWorkWithTwoEditions($known);
    ownBookWithIsbn('9788573263107');

    expect(suggestedIsbn())->toBe(OTHER_ISBN);
})->with([
    'unknown edition' => [[OTHER_ISBN => true]],
    'edition without an author' => [[OTHER_ISBN => true, OWNED_REGISTRANT_ISBN => false]],
]);

test('ISBNs from the publishers you own come first, whatever the order they arrive in', function () {
    ownBooksWithIsbns('9788573263107', '9788573266467', '9788535906097');

    expect(app(PreferredPublishers::class)->sortIsbns([OTHER_ISBN, '9788535909555', OWNED_REGISTRANT_ISBN]))
        ->toBe([OWNED_REGISTRANT_ISBN, '9788535909555', OTHER_ISBN]);
});

function ownBooksWithIsbns(string ...$isbns): void
{
    foreach ($isbns as $isbn) {
        Book::factory()->create(['isbn_13' => $isbn]);
    }
}

test('an unusable edition from your main publisher gives way to the next publisher of yours', function () {
    $secondPreferred = '9788535909555';
    Http::fake(function (Request $request) use ($secondPreferred) {
        $url = urldecode($request->url());

        return match (true) {
            str_contains($url, 'brasilapi.com.br/api/isbn/v1/'.OWNED_REGISTRANT_ISBN) => Http::response(['title' => 'Outro livro', 'authors' => []]),
            str_contains($url, 'brasilapi.com.br/api/isbn/v1/'.$secondPreferred) => Http::response(['title' => 'Crime e castigo', 'authors' => ['Fiódor Dostoiévski']]),
            str_contains($url, 'brasilapi.com.br/api/isbn/v1/'.OTHER_ISBN) => Http::response(['title' => 'Crime e castigo', 'authors' => ['Fiódor Dostoiévski']]),
            ($request->data()['author'] ?? null) !== null => Http::response(['docs' => [[
                'key' => '/works/OL1W',
                'title' => 'Crime e castigo',
                'author_name' => ['Fiódor Dostoiévski'],
                'isbn' => [OTHER_ISBN, $secondPreferred, OWNED_REGISTRANT_ISBN],
            ]]]),
            default => Http::response([], 404),
        };
    });
    ownBooksWithIsbns('9788573266467', '9788535906097');
    ownBookWithIsbn('9788573263107');

    expect(suggestedIsbn())->toBe($secondPreferred);
});
