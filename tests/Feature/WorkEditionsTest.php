<?php

use App\Models\Recommendation;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

const SUGGESTED_ISBN = '9788535907438';
const SUGGESTED_COVER = 'https://covers.openlibrary.org/b/isbn/9788535907438-L.jpg';

/**
 * @return list<array<string, mixed>>
 */
function foreignEntries(int $count, string $prefix = 'Foreign'): array
{
    return array_map(function (int $number) use ($prefix) {
        $base = '978140'.str_pad((string) $number, 6, '0', STR_PAD_LEFT);
        $sum = array_sum(array_map(fn (int $position) => (int) $base[$position] * ($position % 2 === 0 ? 1 : 3), range(0, 11)));

        return ['title' => "{$prefix} {$number}", 'isbn_13' => [$base.((10 - $sum % 10) % 10)]];
    }, range(1, $count));
}

/**
 * @param  array<int, list<array<string, mixed>>|null>  $pagesByOffset  null makes that page fail
 */
function fakeEditionPages(array $pagesByOffset): void
{
    Http::fake(function (Request $request) use ($pagesByOffset) {
        if (str_contains($request->url(), 'editions.json')) {
            $offset = (int) ($request->data()['offset'] ?? 0);
            $entries = array_key_exists($offset, $pagesByOffset) ? $pagesByOffset[$offset] : [];

            return $entries === null ? Http::response([], 503) : Http::response(['entries' => $entries]);
        }

        if (str_contains($request->url(), 'brasilapi.com.br/api/isbn/v1/'.SUGGESTED_ISBN)) {
            return Http::response(['title' => 'O processo', 'authors' => ['Franz Kafka'], 'publisher' => 'Companhia das Letras']);
        }

        return Http::response([], 404);
    });
}

/**
 * @return list<array<string, mixed>>
 */
function editionsOfSuggestion(?string $workKey = 'OL1W'): array
{
    $recommendation = Recommendation::factory()->create([
        'title' => 'O processo',
        'author' => 'Franz Kafka',
        'isbn_13' => SUGGESTED_ISBN,
        'cover_url' => SUGGESTED_COVER,
        'work_key' => $workKey,
        'based_on_book_id' => null,
    ]);

    return test()->getJson(route('suggestions.editions', $recommendation))->assertOk()->json('items');
}

test('the suggested edition comes first even when the work does not list it', function () {
    fakeEditionPages([0 => foreignEntries(3)]);

    $editions = editionsOfSuggestion();

    expect($editions)->toHaveCount(4)
        ->and($editions[0]['isbn_13'])->toBe(SUGGESTED_ISBN)
        ->and($editions[0]['publisher'])->toBe('Companhia das Letras')
        ->and($editions[0]['cover_url'])->toBe(SUGGESTED_COVER);
});

test('the suggested edition is listed once when the work already has it', function () {
    fakeEditionPages([0 => [...foreignEntries(2), ['title' => 'O processo', 'isbn_13' => [SUGGESTED_ISBN]]]]);

    $isbns = array_column(editionsOfSuggestion(), 'isbn_13');

    expect($isbns)->toHaveCount(3)
        ->and($isbns[0])->toBe(SUGGESTED_ISBN);
});

test('the suggested edition is offered when Open Library fails', function () {
    fakeEditionPages([0 => null]);

    expect(array_column(editionsOfSuggestion(), 'isbn_13'))->toBe([SUGGESTED_ISBN]);
});
