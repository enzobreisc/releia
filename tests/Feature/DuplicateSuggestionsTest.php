<?php

use App\Models\Book;
use App\Models\Recommendation;
use App\Services\RecommendationService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(fn () => Storage::fake('local'));

function fakeSingleWork(string $title, string $author = 'Liev Tolstói'): void
{
    Http::fake(function (Request $request) use ($title, $author) {
        $isbn = '9788535900019';

        if (str_contains(urldecode($request->url()), "bibkeys=ISBN:{$isbn}")) {
            return Http::response(["ISBN:{$isbn}" => [
                'title' => $title,
                'authors' => [['name' => $author]],
                'cover' => ['large' => 'https://covers.openlibrary.org/b/id/1-L.jpg'],
                'number_of_pages' => 200,
                'subjects' => [['name' => 'Fiction']],
                'description' => 'x',
            ]]);
        }

        if (($request->data()['author'] ?? null) !== null) {
            return Http::response(['docs' => [['key' => '/works/OL1W', 'title' => $title, 'author_name' => [$author], 'isbn' => [$isbn]]]]);
        }

        return Http::response([], 404);
    });
}

function suggestedTitlesFor(string $ownedTitle, string $foundTitle): array
{
    fakeSingleWork($foundTitle);
    ratedBook($ownedTitle, 'Liev Tolstói', 5);

    app(RecommendationService::class)->generate();

    return Recommendation::pluck('title')->all();
}

test('a book you own under a misspelled title is not suggested', function () {
    expect(suggestedTitlesFor('Os irmãos Karamázov', 'OS IRMAOS KARANAZOV'))->toBe([]);
});

test('another volume of a series you own is still suggested', function () {
    expect(suggestedTitlesFor('Guerra e paz, volume 1', 'Guerra e paz, volume 2'))->toBe(['Guerra e paz, volume 2']);
});

test('a different book with a short similar title is still suggested', function () {
    expect(suggestedTitlesFor('A morte', 'A sorte'))->toBe(['A sorte']);
});

test('a title that is only the name of the author is not a book', function (string $title) {
    expect(suggestedTitlesFor('Ressurreição', $title))->toBe([]);
})->with(['surname' => 'Tolstói', 'full name' => 'Liev Tolstói']);

test('a misspelled title by another author is not mistaken for yours', function () {
    Book::factory()->withAuthors(['Outra Pessoa'])->create(['title' => 'Os irmãos Karamázov']);

    expect(suggestedTitlesFor('Ressurreição', 'Os irmãos Karanazov'))->toBe(['Os irmãos Karanazov']);
});
